// Spinner-only overlay. Same spinner as <Loading />, but with no background
// and no label, so the page underneath stays visible. It still swallows
// clicks/taps while showing, which prevents double submits.
export default function LoadingScreen({ label = "Loading…" }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ pointerEvents: "all", backgroundColor: "rgba(0, 0, 0, 0.38)" }}
    >
      <div
        role="status"
        aria-label={label}
        className="app-spinner h-14 w-14 rounded-full"
      />
    </div>
  );
}
