import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join } from 'node:path';

const exec = promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Live device frames (Epic: live grid). Proxies `lim ios screenshot` for one
// simulator so a dashboard tile can poll real iOS frames. Only real lim ids
// (ios_…) are accepted; anything else 404s and the tile falls back to its icon.
export async function GET(_req: Request, { params }: { params: Promise<{ simId: string }> }) {
  const { simId } = await params;
  if (!/^ios_[a-z0-9_]+$/i.test(simId)) return new Response('bad id', { status: 400 });

  const binDir = join(process.cwd(), '..', '..', 'node_modules', '.bin');
  const out = `/tmp/frame-${simId}.png`;
  try {
    await exec(join(binDir, 'lim'), ['ios', 'screenshot', out, '--id', simId], {
      cwd: process.env.LIM_APP_DIR ?? process.cwd(),
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
      timeout: 15000,
    });
    const buf = await readFile(out);
    return new Response(new Uint8Array(buf), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('frame unavailable', { status: 502 });
  }
}
