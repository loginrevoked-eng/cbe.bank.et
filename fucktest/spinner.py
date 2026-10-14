from __future__ import annotations

import sys
import threading
import time
from dataclasses import dataclass, field
from typing import List, Optional, TextIO

CLEAR_LINE = "\r\033[K"
RED = "\033[31m"
GREEN = "\033[32m"
RESET = "\033[0m"


class _CapturedStream:
    """Stands in for sys.stdout / sys.stderr while the spinner runs, so a plain
    print() from any code (tests, libraries) never lands on the spinner line."""

    def __init__(self, stream: TextIO, spinner: "ConsoleSpinner"):
        self._stream = stream
        self._spinner = spinner

    def write(self, text: str) -> int:
        return self._spinner._write_through(self._stream, text)

    def flush(self) -> None:
        self._stream.flush()

    def __getattr__(self, name: str):
        return getattr(self._stream, name)


@dataclass
class ConsoleSpinner:
    """Animated console line plus permanent output lines.

    - update(text)       changes the text shown next to the spinner on every frame
    - append_line(text)  writes a permanent line; the spinner continues on the next line
    - pause()/resume()   hide / show the spinner without losing its text

    While running, sys.stdout and sys.stderr are wrapped, so stray print()
    calls are written as permanent lines above the spinner instead of garbling it.
    """

    line: str = ""
    paused: bool = False
    frames: List[str] = field(default_factory=lambda: list("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"))
    interval: float = 0.08
    stream: TextIO = field(default_factory=lambda: sys.stdout)
    stop_event: threading.Event = field(default_factory=threading.Event)
    thread_handle: Optional[threading.Thread] = None
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False)
    _drawn: bool = field(default=False, repr=False)  # spinner currently on screen?
    _at_line_start: bool = field(default=True, repr=False)
    _saved_streams: Optional[tuple] = field(default=None, repr=False)

    # ---- lifecycle -------------------------------------------------------
    def start(self) -> "ConsoleSpinner":
        if self.thread_handle and self.thread_handle.is_alive():
            return self
        self.stop_event.clear()
        self._saved_streams = (sys.stdout, sys.stderr)
        sys.stdout = _CapturedStream(self._saved_streams[0], self)
        sys.stderr = _CapturedStream(self._saved_streams[1], self)
        self.thread_handle = threading.Thread(target=self._loop, daemon=True)
        self.thread_handle.start()
        return self

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread_handle:
            self.thread_handle.join()
            self.thread_handle = None
        with self._lock:
            self._erase()
        if self._saved_streams:
            sys.stdout, sys.stderr = self._saved_streams
            self._saved_streams = None

    def __enter__(self) -> "ConsoleSpinner":
        return self.start()

    def __exit__(self, *exc) -> None:
        self.stop()

    # ---- spinner control -------------------------------------------------
    def pause(self) -> None:
        with self._lock:
            self.paused = True
            self._erase()

    def resume(self) -> None:
        with self._lock:
            self.paused = False

    # ---- TestUI interface ------------------------------------------------
    def update(self, text: str) -> None:
        """Change the text rendered next to the spinner (picked up next frame)."""
        with self._lock:
            self.line = text

    def append_line(self, text: str) -> None:
        """Write a permanent line; the spinner continues on the line below it."""
        with self._lock:
            self._erase()
            self.stream.write(text + "\n")
            self.stream.flush()
            self._at_line_start = True

    def error(self, text: str) -> None:
        self.append_line(f"{RED}{text}{RESET}")

    def success(self, text: str) -> None:
        self.append_line(f"{GREEN}{text}{RESET}")

    # ---- internals -------------------------------------------------------
    def _write_through(self, stream: TextIO, text: str) -> int:
        with self._lock:
            self._erase()
            written = stream.write(text)
            if text:
                self._at_line_start = text.endswith("\n")
            return written

    def _erase(self) -> None:
        if self._drawn:
            self.stream.write(CLEAR_LINE)
            self.stream.flush()
            self._drawn = False

    def _animated(self) -> bool:
        return bool(getattr(self.stream, "isatty", lambda: False)())

    def _loop(self) -> None:
        i = 0
        while not self.stop_event.is_set():
            with self._lock:
                if self._animated() and not self.paused and self._at_line_start:
                    frame = self.frames[i % len(self.frames)]
                    self.stream.write(f"{CLEAR_LINE}{frame} {self.line}")
                    self.stream.flush()
                    self._drawn = True
                    i += 1
            time.sleep(self.interval)


if __name__ == "__main__":
    with ConsoleSpinner() as ui:
        for name in ("parser", "network", "database"):
            ui.update(f"Running Test for {name}")
            time.sleep(1)
            print(f"stray print from library code ({name})")
            ui.append_line(f"Ok:   {name} passed")
            ui.success("    result: fine")
        ui.update("Running Test for flaky")
        time.sleep(1)
        ui.append_line("Fail: flaky failed")
        ui.error("    exception: TimeoutError()")
        ui.pause()
        time.sleep(1)
        ui.resume()
        ui.update("Wrapping up")
        time.sleep(1)