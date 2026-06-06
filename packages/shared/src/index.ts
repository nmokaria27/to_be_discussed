/**
 * @swarm/shared — the contract layer (C1, C5, C8, C9) every workstream imports.
 */

export * from './types.ts';
export * from './personas.ts';
export * from './edge-cases.ts';
export * from './writer.ts';
export * from './insforge-writer.ts';
export * from './insforge-reader.ts';
export * from './fake-swarm.ts';
export { makeRng } from './rng.ts';
export type { Rng } from './rng.ts';
