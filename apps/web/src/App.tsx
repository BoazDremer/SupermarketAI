import { workspaceHealthSchema } from '@supermarket-price-compare/shared';

export function App() {
  const sample = workspaceHealthSchema.parse({ ok: true });

  return (
    <main className="app">
      <h1>Supermarket Price Compare</h1>
      <p className="lede">Israeli delivery-supermarket basket comparison — skeleton UI.</p>
      <p className="meta">Shared package health check: {String(sample.ok)}</p>
    </main>
  );
}
