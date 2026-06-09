export default function Home() {
  return (
    <main>
      <h1>Референт</h1>
      <p>AI-помощник для английских статей</p>

      <textarea
        placeholder="Вставьте URL статьи или текст..."
        aria-label="Текст статьи"
      />

      <div className="actions">
        <button type="button">О чём статья?</button>
        <button type="button">Тезисы</button>
        <button type="button">Подробный перевод</button>
      </div>
    </main>
  );
}
