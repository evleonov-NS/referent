import ReferentForm from "./components/ReferentForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Референт</h1>
      <p className="mb-8 text-slate-600">
        AI-помощник для анализа иностранных статей и писем
      </p>
      <ReferentForm />
    </main>
  );
}
