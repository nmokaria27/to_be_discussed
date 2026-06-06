/**
 * Tiny deterministic PRNG (mulberry32) + helpers.
 *
 * Determinism matters here: seeded fixtures must be byte-stable across reruns so
 * the Dashboard and Report devs get reproducible data, and diffs stay clean.
 */

export interface Rng {
  next(): number; // [0, 1)
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  bool(p?: number): boolean;
  /** A stable pseudo-uuid derived from the stream (not RFC4122, fine for fixtures). */
  id(prefix: string): string;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  let counter = 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('pick() on empty array');
      return arr[int(arr.length)] as T;
    },
    bool(p = 0.5): boolean {
      return next() < p;
    },
    id(prefix: string): string {
      counter += 1;
      const hex = (Math.floor(next() * 0xffffffff) >>> 0).toString(16).padStart(8, '0');
      return `${prefix}_${counter.toString().padStart(3, '0')}${hex}`;
    },
  };
}
