const templates = {
  route: { code: "404", title: "Invalid route" },
  page: { code: "404", title: "Page not found" },
  link: { code: "404", title: "Invalid link" },
};

export default function PageNotFound({ message, kind = "page" }) {
  const template = templates[kind] ?? templates.route;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-6 text-neutral-900">
      <section className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-800">{template.code}</p>
        <h1 className="mt-3 text-2xl font-bold">{template.title}</h1>
        <p className="mt-2 break-words text-sm text-neutral-600">{message}</p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mt-6 w-full rounded-full bg-purple-800 px-5 py-3 font-semibold text-white hover:bg-purple-900"
        >
          Go back
        </button>
      </section>
    </main>
  );
}
