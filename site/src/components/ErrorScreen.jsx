import { TriangleAlert } from "lucide-react";
import Screen, { PURPLE, GOLD } from "./Screen.jsx";

export default function ErrorScreen({ message = "Something went wrong.", onRetry }) {
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