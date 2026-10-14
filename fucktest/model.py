from __future__ import annotations

import argparse
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Protocol

from .spinner import ConsoleSpinner


class TestUI(Protocol):
    def update(self, text: str) -> None: ...
    def append_line(self, text: str) -> None: ...
    def error(self, text: str) -> None: ...
    def success(self, text: str) -> None: ...


@dataclass
class TestInfo:
    title: str
    description: str = ""


@dataclass
class TestBody:
    # Called as fn(ui, **kwargs): the UI is always the first positional argument.
    fn: Callable[..., Result]
    kwargs: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Result:
    message: str


@dataclass
class ResultError(Result):
    exception: Exception


@dataclass
class ResultOk(Result):
    result: Any


@dataclass
class Test:
    __test__ = False  # stop pytest from trying to collect this class

    info: TestInfo
    body: TestBody
    ui: Optional[TestUI] = None

    @property
    def name(self) -> str:
        """CLI-friendly name derived from the title, e.g. 'My Test' -> 'my-test'."""
        return re.sub(r"[^a-z0-9]+", "-", self.info.title.lower()).strip("-")

    def _run(self) -> Result:
        try:
            self.ui.update(f"Running Test for {self.info.title}")
            result = self.body.fn(self.ui, **self.body.kwargs)
            if not isinstance(result, Result):
                raise TypeError(
                    f"test fn must return a Result, got {type(result).__name__}"
                )
            return result
        except Exception as e:
            return ResultError(str(e) or type(e).__name__, e)

    def run(self) -> bool:
        match self._run():
            case ResultError(message=message, exception=exception):
                self.ui.error(f"Fail: {self.info.title} failed")
                self.ui.error(" " * 4 + f"message: {message}")
                self.ui.error(" " * 4 + f"exception: {exception!r}")
                return False
            case ResultOk(message=message, result=result):
                self.ui.success(f"Ok:   {self.info.title} passed")
                self.ui.success(" " * 4 + f"message: {message}")
                self.ui.success(" " * 4 + f"result: {result}")
                return True
            case _:
                return False


@dataclass
class TestManager:
    __test__ = False

    ui: ConsoleSpinner
    tests: List[Test]
    passed: int = 0
    failed: int = 0

    def parse_args(self, argv: Optional[List[str]] = None) -> List[Test]:
        parser = argparse.ArgumentParser(
            description="Run the tests. Pass one or more flags to pick tests; "
            "with no flags, every test runs."
        )
        for test in self.tests:
            parser.add_argument(
                f"--{test.name}",
                action="store_true",
                help=f"run {test.info.title}",
            )
        args = parser.parse_args(argv)
        selected = [
            test for test in self.tests
            if getattr(args, test.name.replace("-", "_"), False)
        ]
        return selected or self.tests

    def run(self, tests: Optional[List[Test]] = None) -> bool:
        tests = tests or self.parse_args()
        self.passed = self.failed = 0
        self.ui.start()
        try:
            for test in tests if tests is not None else self.tests:
                test.ui = self.ui
                if test.run():
                    self.passed += 1
                else:
                    self.failed += 1
            report = self.ui.success if self.failed == 0 else self.ui.error
            report(self.summary())
        finally:
            self.ui.stop()
        return self.failed == 0

    def summary(self) -> str:
        total = self.passed + self.failed
        if total == 0:
            return "No tests were run"
        return f"{self.passed} passed, {self.failed} failed ({total} total)"