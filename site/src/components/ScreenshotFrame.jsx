import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { toPng } from "html-to-image";

const GOLD = "#d9b46c";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Four crisp corner brackets that snap in around the captured area
function Corner({ pos }) {
  const base = { position: "absolute", width: 22, height: 22, borderColor: GOLD, borderStyle: "solid", borderWidth: 0 };
  const sides = {
    tl: { top: -3, left: -3, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    tr: { top: -3, right: -3, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    bl: { bottom: -3, left: -3, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    br: { bottom: -3, right: -3, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  };
  return <span style={{ ...base, ...sides[pos] }} />;
}

/**
 * Wraps a screen and exposes ref.capture(filename).
 * Captures the element marked data-receipt (falls back to the whole wrapper),
 * plays an outline + flash effect, and downloads a PNG.
 */
const ScreenshotFrame = forwardRef(function ScreenshotFrame({ children, onDone }, ref) {
  const root = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | frame | flash
  const [rect, setRect] = useState(null);

  useImperativeHandle(ref, () => ({
    async capture(filename = "receipt.png") {
      if (!root.current || phase !== "idle") return;
      const target = root.current.querySelector("[data-receipt]") || root.current;
      const box = target.getBoundingClientRect();
      const host = root.current.getBoundingClientRect();

      setRect({ top: box.top - host.top, left: box.left - host.left, width: box.width, height: box.height });
      setPhase("frame");

      try {
        const [dataUrl] = await Promise.all([
          toPng(target, {
            pixelRatio: 2,
            cacheBust: true,
            filter: (node) => !node.dataset?.captureIgnore,
          }),
          wait(450), // let the outline animation play
        ]);

        setPhase("flash");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        await wait(350);
        onDone?.(true);
      } catch (err) {
        console.error("Screenshot failed", err);
        onDone?.(false);
      } finally {
        setPhase("idle");
      }
    },
  }));

  return (
    <div ref={root} className="relative">
      {children}

      {phase !== "idle" && rect && (
        <div data-capture-ignore="true" className="pointer-events-none absolute inset-0 z-50">
          <style>{`
            @keyframes shot-frame { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: scale(1); } }
            @keyframes shot-flash { from { opacity: .85; } to { opacity: 0; } }
          `}</style>

          {/* Outline */}
          <div
            style={{
              position: "absolute",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              animation: "shot-frame 220ms cubic-bezier(.2,.9,.3,1) both",
              boxShadow: `0 0 0 1px ${GOLD}66, 0 0 0 9999px rgba(0,0,0,.28)`,
              borderRadius: 12,
            }}
          >
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </div>

          {/* Shutter flash */}
          {phase === "flash" && (
            <div
              style={{ position: "absolute", inset: 0, background: "#fff", animation: "shot-flash 350ms ease-out both" }}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default ScreenshotFrame;