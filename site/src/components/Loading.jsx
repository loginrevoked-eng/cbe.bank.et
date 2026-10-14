import { TriangleAlert } from "lucide-react";

const PURPLE = "#7a1c9e";
const GOLD = "#d9b46c";

// Full-screen frame that matches the app's 480px mobile column
function Screen({ children }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-4 bg-[#f8f7fb] px-8 text-center shadow-xl">
      {children}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <Screen>
      <div
        role="status"
        aria-label={label}
        className="app-spinner h-14 w-14 rounded-full"
        style={{ borderTopColor: PURPLE }}
      />
      <p className="text-base font-medium text-[#3a0b55]">{label}</p>
    </Screen>
  );
}

export function ErrorScreen({ message = "Something went wrong.", onRetry }) {
  return (
    <Screen>
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "#f0e4cf", color: PURPLE }}
      >
        <TriangleAlert size={28} />
      </span>
      <p className="text-base font-semibold text-[#3a0b55]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full px-6 py-3 font-bold text-white"
          style={{ backgroundColor: PURPLE, border: `2px solid ${GOLD}` }}
        >
          Try again
        </button>
      )}
    </Screen>
  );
}

export default Loading;
