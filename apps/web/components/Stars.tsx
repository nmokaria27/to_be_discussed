/** Presentational star rating (no client hooks). value 0–5, optionally fractional. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'stars__on' : 'stars__off'}>
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
