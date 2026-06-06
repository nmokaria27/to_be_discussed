'use client';

import { createClient } from '@insforge/sdk';

export const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL ?? '';
export const INSFORGE_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? '';
export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'fixture';

let _client: ReturnType<typeof createClient> | null = null;

/** Singleton browser SDK client for realtime + reads. */
export function insforgeClient(): ReturnType<typeof createClient> {
  if (!_client) {
    _client = createClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });
  }
  return _client;
}
