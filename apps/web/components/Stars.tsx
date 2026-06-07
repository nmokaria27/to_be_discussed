import { Star } from 'lucide-react';

/** Star rating with real icons (lucide). value 0–5, optionally fractional. */
export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < filled ? '' : 'stars__off'}
          fill={i < filled ? 'currentColor' : 'none'}
          strokeWidth={i < filled ? 0 : 1.6}
        />
      ))}
    </span>
  );
}
