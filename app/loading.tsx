export default function Loading() {
  return (
    <div className="loading-page" role="status" aria-label="Memuat workspace">
      <div className="skeleton skeleton-title" />
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
      <div className="skeleton skeleton-panel" />
      <span className="sr-only">Memuat data terbaru…</span>
    </div>
  );
}
