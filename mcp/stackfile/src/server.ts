import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { allowedRoots, checkPath } from './paths.js';
import { readStack, Stack } from './reader.js';
import { toStackTalk } from './convert.js';
import { lookup, REFERENCE } from './reference.js';

// M2.2: this server only reads files. It never writes or runs anything from a stack.
const ROOTS = allowedRoots();

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const json = (v: unknown) => text(JSON.stringify(v, null, 2));

function load(path: string): { ok: true; stack: Stack; name: string } | { ok: false; reply: ReturnType<typeof text> } {
  const c = checkPath(path, ROOTS);
  if (!c.ok) return { ok: false, reply: text(c.message) };
  const r = readStack(new Uint8Array(readFileSync(c.path)));
  if (!r.ok) return { ok: false, reply: text(r.error) };
  return { ok: true, stack: r.stack, name: basename(c.path, extname(c.path)) };
}

const server = new McpServer({ name: 'stackfile', version: '0.2.0' });

server.tool('inspect_stack', 'Block types, counts and card names of a HyperCard stack file',
  { path: z.string() },
  async ({ path }) => {
    const l = load(path);
    if (!l.ok) return l.reply;
    const s = l.stack;
    const counts: Record<string, number> = {};
    for (const b of s.blocks) counts[b.type] = (counts[b.type] ?? 0) + 1;
    return json({
      name: l.name,
      format: s.format,
      version: s.version,
      size: { width: s.cardWidth, height: s.cardHeight },
      blocks: counts,
      backgrounds: s.backgrounds.map((b) => ({ id: b.id, name: b.name })),
      cards: s.cards.map((c, i) => ({ index: i, id: c.id, name: c.name, background: c.backgroundId })),
      warnings: s.warnings,
    });
  });

server.tool('get_card', 'Objects and scripts on one card (index is 0-based, in stack order)',
  { path: z.string(), index: z.number().int().min(0) },
  async ({ path, index }) => {
    const l = load(path);
    if (!l.ok) return l.reply;
    const card = l.stack.cards[index];
    if (!card) return text(`No card at index ${index}. The stack has ${l.stack.cards.length} cards.`);
    const bg = l.stack.backgrounds.find((b) => b.id === card.backgroundId);
    return json({ card, background: bg ?? null });
  });

server.tool('extract_scripts', 'All scripts with their owner and line count',
  { path: z.string() },
  async ({ path }) => {
    const l = load(path);
    if (!l.ok) return l.reply;
    const s = l.stack;
    const out: { owner: string; lines: number; script: string }[] = [];
    const add = (owner: string, script: string) => {
      if (script.trim()) out.push({ owner, lines: script.split('\n').length, script });
    };
    add('stack', s.script);
    for (const b of s.backgrounds) {
      add(`background ${b.id} "${b.name}"`, b.script);
      for (const p of b.parts) add(`background ${p.kind} ${p.id} "${p.name}" of background ${b.id}`, p.script);
    }
    for (const c of s.cards) {
      add(`card ${c.id} "${c.name}"`, c.script);
      for (const p of c.parts) add(`card ${p.kind} ${p.id} "${p.name}" of card ${c.id}`, p.script);
    }
    return json(out);
  });

server.tool('convert_stack', 'Convert a stack to StackTalk JSON, listing what could not convert',
  { path: z.string() },
  async ({ path }) => {
    const l = load(path);
    return l.ok ? json(toStackTalk(l.stack, l.name)) : l.reply;
  });

server.tool('lookup_command', 'Reference text for a HyperTalk command',
  { name: z.string() },
  async ({ name }) => text(lookup(name) ?? `No entry for "${name}". Known: ${Object.keys(REFERENCE).join(', ')}`));

await server.connect(new StdioServerTransport());
