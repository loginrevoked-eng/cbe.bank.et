import { useEffect } from "react";
import { X } from "lucide-react";

export default function ErrorToast({ message, onClose, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1100] mx-auto w-full max-w-[480px] px-3 pt-3">
      <div
        role="alert"
        className="error-toast-enter pointer-events-auto flex items-center gap-3 rounded-lg bg-red-700 px-4 py-3 text-white shadow-xl"
      >
        <p className="flex-1 whitespace-pre-line text-sm font-semibold leading-6 text-white">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-white/90 hover:bg-white/15 active:bg-white/25"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
