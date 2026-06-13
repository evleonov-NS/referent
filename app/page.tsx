import ReferentForm from "./components/ReferentForm";

export default function Home() {
  return (
    <main className="mx-auto min-w-0 max-w-4xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        Референт
      </h1>
      <p className="mb-6 text-sm text-slate-600 sm:mb-8 sm:text-base">
        AI-помощник для анализа иностранных статей и писем
      </p>
      <ReferentForm />
    </main>
  );
}
