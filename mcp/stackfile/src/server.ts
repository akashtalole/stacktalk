import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve, sep } from 'node:path';
import { statSync } from 'node:fs';

// M2.1: only read files under allowed folders (STACKFILE_ALLOWED, ':'-separated).
const ALLOWED = (process.env.STACKFILE_ALLOWED ?? process.cwd()).split(':').map((p) => resolve(p));
const MAX_BYTES = 50 * 1024 * 1024; // M2.3

export function checkPath(p: string): { ok: true; path: string } | { ok: false; message: string } {
  const full = resolve(p);
  if (!ALLOWED.some((a) => full === a || full.startsWith(a + sep))) {
    return { ok: false, message: 'That file is outside the allowed folders.' };
  }
  try {
    if (statSync(full).size > MAX_BYTES) return { ok: false, message: 'That file is too big.' };
  } catch {
    return { ok: false, message: 'That file cannot be read.' };
  }
  return { ok: true, path: full };
}

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const notYet = (name: string) => text(`${name} is not built yet. See .kiro/specs/stackfile-mcp.`);

const server = new McpServer({ name: 'stackfile', version: '0.1.0' });

server.tool('inspect_stack', 'Block types, counts and card names of a HyperCard stack file',
  { path: z.string() },
  async ({ path }) => {
    const c = checkPath(path);
    return c.ok ? notYet('inspect_stack') : text(c.message);
  });

server.tool('get_card', 'Objects and scripts on one card',
  { path: z.string(), index: z.number().int().min(0) },
  async ({ path }) => {
    const c = checkPath(path);
    return c.ok ? notYet('get_card') : text(c.message);
  });

server.tool('extract_scripts', 'All scripts with owner and line numbers',
  { path: z.string() },
  async ({ path }) => {
    const c = checkPath(path);
    return c.ok ? notYet('extract_scripts') : text(c.message);
  });

server.tool('convert_stack', 'Convert a stack to StackTalk JSON, listing what could not convert',
  { path: z.string() },
  async ({ path }) => {
    const c = checkPath(path);
    return c.ok ? notYet('convert_stack') : text(c.message);
  });

server.tool('lookup_command', 'Reference text for a HyperTalk command',
  { name: z.string() },
  async ({ name }) => notYet(`lookup_command(${name})`));

await server.connect(new StdioServerTransport());
