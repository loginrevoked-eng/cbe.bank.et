export const PURPLE = "#7a1c9e";
export const GOLD = "#d9b46c";

// Full-screen frame that matches the app's 480px mobile column
export default function Screen({ children }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-4 bg-[#f8f7fb] px-8 text-center shadow-xl">
      {children}
    </div>
  );
}