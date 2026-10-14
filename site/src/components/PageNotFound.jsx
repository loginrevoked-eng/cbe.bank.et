import { useNavigate } from "react-router-dom";

export default function PageNotFound({ message = "Page not found" }) {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-6 text-neutral-900">
      <section className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-800">404</p>
        <h1 className="mt-3 text-2xl font-bold">{message}</h1>
        <p className="mt-2 text-sm text-neutral-600">This link may be invalid or no longer available.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 w-full rounded-full bg-purple-800 px-5 py-3 font-semibold text-white hover:bg-purple-900"
        >
          Go back
        </button>
      </section>
    </main>
  );
}
