import { createPortal } from "react-dom";

const PURPLE = "#7a1c9e";

export default function PaidAnimationOverlay({ active, onDone }) {
  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="paid-overlay"
      data-capture-ignore="true"
    >
      <style>{`
        @keyframes paid-stamp-pop {
          0% { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(0.76); }
          34% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1.045); }
          39% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1.018); }
          44% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1.004); }
          49%, 60% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
          67% { opacity: 0.82; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(1.16); }
        }
        .paid-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          overflow: hidden;
          pointer-events: none;
        }
        .paid-overlay-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          width: max-content;
          height: 62px;
          align-items: center;
          justify-content: flex-start;
          box-sizing: border-box;
          padding: 0 22px;
          border: 3px solid #fff;
          border-radius: 16px;
          background: ${PURPLE};
          color: #fff;
          box-shadow: 0 16px 42px rgba(43, 8, 58, 0.28);
          font: 900 clamp(34px, 9vw, 42px)/1 Roboto, Arial, sans-serif;
          letter-spacing: 0.015em;
          text-align: left;
          white-space: nowrap;
          transform-origin: center;
          animation: paid-stamp-pop 2100ms cubic-bezier(0.22, 0.82, 0.24, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .paid-overlay-stamp { animation-duration: 1ms; }
        }
      `}</style>
      <div
        role="status"
        className="paid-overlay-stamp"
        onAnimationEnd={onDone}
      >
        Paid
      </div>
    </div>,
    document.body,
  );
}
