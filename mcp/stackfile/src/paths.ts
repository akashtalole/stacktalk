import { realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const MAX_BYTES = 50 * 1024 * 1024; // M2.3

/** Allowed folders from STACKFILE_ALLOWED (':'-separated), resolved through symlinks. */
export function allowedRoots(env = process.env.STACKFILE_ALLOWED, cwd = process.cwd()): string[] {
  return (env ?? cwd).split(':').filter(Boolean).map((p) => {
    try { return realpathSync(resolve(cwd, p)); } catch { return resolve(cwd, p); }
  });
}

/** M2.1: only files under an allowed folder, after following symlinks, and not too big. */
export function checkPath(p: string, roots: string[], maxBytes = MAX_BYTES):
  { ok: true; path: string } | { ok: false; message: string } {
  let full: string;
  try { full = realpathSync(resolve(p)); } catch { return { ok: false, message: 'That file cannot be found.' }; }
  if (!roots.some((a) => full === a || full.startsWith(a + sep))) {
    return { ok: false, message: 'That file is outside the allowed folders.' };
  }
  const st = statSync(full);
  if (!st.isFile()) return { ok: false, message: 'That path is not a file.' };
  if (st.size > maxBytes) return { ok: false, message: 'That file is too big.' };
  return { ok: true, path: full };
}
