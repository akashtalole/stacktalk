// Pure reader for HyperCard 2.x stack files (M3). No file system, no network.
// Layout source: "HyperCard file format" by Mister Z and Pierre Lorenzi,
// https://hypercard.org/hypercard_file_format_pierre/ (reverse engineered, unofficial).

export type Rect = { top: number; left: number; bottom: number; right: number };

export type Block = { type: string; id: number; offset: number; size: number };

export type Part = {
  id: number;
  kind: 'button' | 'field' | 'unknown';
  name: string;
  script: string;
  rect: Rect;
  visible: boolean;
  style: number;
};

export type Layer = {
  id: number;
  name: string;
  script: string;
  parts: Part[];
  /** Text for parts, keyed by part id. `card` = this layer's parts, `bg` = background parts (card blocks only). */
  text: { card: Record<number, string>; bg: Record<number, string> };
  bitmapId: number;
  osaScript: boolean;
};

export type Card = Layer & { backgroundId: number };

export type Stack = {
  format: number;
  version: string;
  cardWidth: number;
  cardHeight: number;
  script: string;
  osaScript: boolean;
  blocks: Block[];
  backgrounds: Layer[];
  cards: Card[];
  /** Things the reader skipped or could not read. */
  warnings: string[];
};

export type ReadResult = { ok: true; stack: Stack } | { ok: false; error: string };

export const MAX_BLOCKS = 200_000;
const HEADER = 16;
const KNOWN = new Set(['STAK', 'MAST', 'LIST', 'PAGE', 'BKGD', 'CARD', 'BMAP', 'FREE', 'STBL', 'FTBL', 'PRNT', 'PRST', 'PRFT', 'TAIL']);

class OutOfBounds extends Error {}

/** Bounds-checked big-endian view. Every read past the end throws OutOfBounds, caught by readStack. */
class View {
  constructor(private readonly b: Uint8Array, readonly start = 0, readonly end = b.length) {}
  private at(off: number, n: number) {
    const p = this.start + off;
    if (off < 0 || p + n > this.end) throw new OutOfBounds(`read past end at ${p}`);
    return p;
  }
  u8(off: number) { return this.b[this.at(off, 1)]!; }
  s8(off: number) { const v = this.u8(off); return v > 127 ? v - 256 : v; }
  u16(off: number) { const p = this.at(off, 2); return (this.b[p]! << 8) | this.b[p + 1]!; }
  s16(off: number) { const v = this.u16(off); return v > 0x7fff ? v - 0x10000 : v; }
  u32(off: number) { const p = this.at(off, 4); return ((this.b[p]! << 24) >>> 0) + (this.b[p + 1]! << 16) + (this.b[p + 2]! << 8) + this.b[p + 3]!; }
  s32(off: number) { return this.u32(off) | 0; }
  ascii4(off: number) { const p = this.at(off, 4); return String.fromCharCode(...this.b.subarray(p, p + 4)); }
  bytes(off: number, n: number) { const p = this.at(off, n); return this.b.subarray(p, p + n); }
  /** C string from `off`. Returns text and the offset just past the NUL (or the end). */
  cstr(off: number): { text: string; next: number } {
    const p = this.at(off, 0);
    let q = p;
    while (q < this.end && this.b[q] !== 0) q++;
    return { text: macRoman(this.b.subarray(p, q)), next: q - this.start + 1 };
  }
  sub(off: number, n: number) { const p = this.at(off, n); return new View(this.b, p, p + n); }
  get length() { return this.end - this.start; }
}

let decoder: TextDecoder | null | undefined;
/** MacRoman to string, with CR line endings turned into \n. */
export function macRoman(bytes: Uint8Array): string {
  if (decoder === undefined) {
    try { decoder = new TextDecoder('macintosh'); } catch { decoder = null; }
  }
  const s = decoder ? decoder.decode(bytes) : String.fromCharCode(...bytes);
  return s.replace(/\r\n?/g, '\n');
}

/** Skip a 128-byte MacBinary header if the file has one. */
function unwrap(b: Uint8Array): { bytes: Uint8Array; macBinary: boolean } {
  const tag = (o: number) => String.fromCharCode(...b.subarray(o + 4, o + 8));
  if (b.length >= 8 && tag(0) === 'STAK') return { bytes: b, macBinary: false };
  if (b.length >= 136 && tag(128) === 'STAK') return { bytes: b.subarray(128), macBinary: true };
  return { bytes: b, macBinary: false };
}

/** Walk the block stream (M3.1). Stops at TAIL. */
export function readBlocks(b: Uint8Array): { ok: true; blocks: Block[]; warnings: string[] } | { ok: false; error: string } {
  const v = new View(b);
  const blocks: Block[] = [];
  const warnings: string[] = [];
  let off = 0;
  while (off < b.length) {
    if (b.length - off < HEADER) { warnings.push(`Trailing ${b.length - off} bytes after the last block`); break; }
    const size = v.u32(off);
    const type = v.ascii4(off + 4);
    const id = v.s32(off + 8);
    if (blocks.length === 0 && type !== 'STAK') return { ok: false, error: 'Not a HyperCard stack: first block is not STAK' };
    if (size < HEADER || size > b.length - off) return { ok: false, error: `Corrupt block at byte ${off}: size ${size} does not fit` };
    if (blocks.length >= MAX_BLOCKS) return { ok: false, error: 'Too many blocks' };
    blocks.push({ type, id, offset: off, size });
    if (!KNOWN.has(type)) warnings.push(`Unknown block "${type}" (id ${id}) skipped`);
    off += size;
    if (type === 'TAIL') break;
  }
  if (blocks.at(-1)?.type !== 'TAIL') warnings.push('No TAIL block: file may be cut short');
  return { ok: true, blocks, warnings };
}

function version(n: number): string {
  if (n === 0) return 'unknown';
  const major = (n >>> 24) & 0xff, minor = (n >>> 20) & 0xf, bug = (n >>> 16) & 0xf;
  const stage = ({ 0x80: '', 0x60: 'b', 0x40: 'a', 0x20: 'd' } as Record<number, string>)[(n >>> 8) & 0xff] ?? '?';
  const rel = n & 0xff;
  return `${major}.${minor}${bug ? `.${bug}` : ''}${stage}${stage && rel ? rel : ''}`;
}

function readParts(v: View, start: number, count: number, warnings: string[], where: string): Part[] {
  const parts: Part[] = [];
  let off = start;
  for (let i = 0; i < count; i++) {
    const size = v.u16(off);
    if (size < 0x1e) { warnings.push(`${where}: part ${i} is too small (${size} bytes), stopped`); break; }
    const p = v.sub(off, size);
    const type = p.u8(4);
    const name = p.cstr(0x1e);
    // One "script indicator" byte (0) sits between name and script.
    const script = name.next + 1 <= p.length ? p.cstr(name.next + 1) : { text: '', next: 0 };
    parts.push({
      id: p.u16(2),
      kind: type === 1 ? 'button' : type === 2 ? 'field' : 'unknown',
      name: name.text,
      script: script.text,
      rect: { top: p.s16(6), left: p.s16(8), bottom: p.s16(10), right: p.s16(12) },
      visible: (p.u8(5) & 0x80) === 0,
      style: p.u8(0x0f),
    });
    off += size;
  }
  return parts;
}

function readContents(v: View, start: number, count: number, warnings: string[], where: string) {
  const text = { card: {} as Record<number, string>, bg: {} as Record<number, string> };
  let off = start;
  for (let i = 0; i < count; i++) {
    const partId = v.s16(off);
    const len = v.u16(off + 2);
    const data = v.sub(off + 4, len);
    let s = '';
    if (len > 0) {
      if (data.u8(0) === 0) {
        s = macRoman(data.bytes(1, len - 1));
      } else {
        const styleLen = data.u16(0) & 0x7fff;
        if (styleLen > len) { warnings.push(`${where}: bad style length in part content ${i}`); s = ''; }
        else { s = macRoman(data.bytes(styleLen, len - styleLen)); warnings.push(`${where}: styled text in part ${Math.abs(partId)} kept as plain text`); }
      }
    }
    if (partId < 0) text.card[-partId] = s; else text.bg[partId] = s;
    off += 4 + len;
    if (off % 2) off++; // entries are padded to an even length
  }
  return text;
}

/** A script that starts with NUL and has non-zero bytes after it is compiled OSA. An empty script is just NUL (plus padding). */
function isOsa(v: View, off: number): boolean {
  if (v.u8(off) !== 0) return false;
  for (let i = off + 1; i < v.length; i++) if (v.u8(i) !== 0) return true;
  return false;
}

/** CARD and BKGD share the part layout after their own header. */
function readLayer(v: View, partsHeader: number, warnings: string[], where: string): Omit<Layer, 'id' | 'bitmapId'> {
  const partCount = v.u16(partsHeader);
  const partListSize = v.u32(partsHeader + 4);
  const contentCount = v.u16(partsHeader + 8);
  const contentSize = v.u32(partsHeader + 10);
  const partsStart = partsHeader + 14;
  const parts = readParts(v, partsStart, partCount, warnings, where);
  const contentsStart = partsStart + partListSize;
  const text = readContents(v, contentsStart, contentCount, warnings, where);
  const name = v.cstr(contentsStart + contentSize);
  let script = '';
  let osaScript = false;
  if (name.next < v.length) {
    if (isOsa(v, name.next)) osaScript = true;
    else script = v.cstr(name.next).text;
  }
  return { name: name.text, script, parts, text, osaScript };
}

/** Card ids in stack order, from LIST and PAGE blocks. */
function cardOrder(b: Uint8Array, blocks: Block[], warnings: string[]): number[] | null {
  const list = blocks.find((x) => x.type === 'LIST');
  if (!list) { warnings.push('No LIST block: cards kept in file order'); return null; }
  const lv = new View(b, list.offset, list.offset + list.size);
  const pageCount = lv.u32(0x10);
  const entrySize = lv.u16(0x1c);
  if (entrySize < 4) { warnings.push('LIST entry size is too small: cards kept in file order'); return null; }
  const pages = new Map(blocks.filter((x) => x.type === 'PAGE').map((x) => [x.id, x]));
  const order: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageId = lv.s32(0x30 + i * 6);
    const n = lv.u16(0x30 + i * 6 + 4);
    const page = pages.get(pageId);
    if (!page) { warnings.push(`PAGE ${pageId} is missing: some cards kept in file order`); return null; }
    const pv = new View(b, page.offset, page.offset + page.size);
    for (let j = 0; j < n; j++) order.push(pv.s32(0x18 + j * entrySize));
  }
  return order;
}

/** Read a whole stack. Never throws: bad input gives `{ ok: false }` (M2.3). */
export function readStack(input: Uint8Array): ReadResult {
  try {
    const { bytes: b, macBinary } = unwrap(input);
    const walked = readBlocks(b);
    if (!walked.ok) return walked;
    const { blocks } = walked;
    const warnings = [...walked.warnings];
    if (macBinary) warnings.push('MacBinary header skipped');

    const stak = blocks[0]!;
    const sv = new View(b, stak.offset, stak.offset + stak.size);
    const format = sv.u32(0x10);
    if (format < 9) warnings.push(`Format ${format} is HyperCard 1.x or older: card layouts may not read correctly`);
    let script = '';
    let osaScript = false;
    if (sv.length > 0x600) {
      if (isOsa(sv, 0x600)) osaScript = true;
      else script = sv.cstr(0x600).text;
    }
    if (osaScript) warnings.push('Stack script is a compiled OSA script and was not read');

    const backgrounds: Layer[] = [];
    const cardsById = new Map<number, Card>();
    const fileOrder: number[] = [];
    for (const blk of blocks) {
      const v = new View(b, blk.offset, blk.offset + blk.size);
      try {
        if (blk.type === 'BKGD') {
          const where = `Background ${blk.id}`;
          backgrounds.push({ id: blk.id, bitmapId: v.s32(0x10), ...readLayer(v, 0x24, warnings, where) });
        } else if (blk.type === 'CARD') {
          const where = `Card ${blk.id}`;
          const card: Card = { id: blk.id, bitmapId: v.s32(0x10), backgroundId: v.s32(0x24), ...readLayer(v, 0x28, warnings, where) };
          cardsById.set(blk.id, card);
          fileOrder.push(blk.id);
        }
      } catch (e) {
        if (!(e instanceof OutOfBounds)) throw e;
        warnings.push(`${blk.type} ${blk.id} is damaged and was skipped`);
      }
    }
    for (const l of [...backgrounds, ...cardsById.values()]) {
      if (l.osaScript) warnings.push(`Script of ${l.name || `id ${l.id}`} is compiled OSA and was not read`);
    }
    for (const bmp of blocks.filter((x) => x.type === 'BMAP')) warnings.push(`Picture BMAP ${bmp.id} not converted`);

    let order: number[] | null = null;
    try { order = cardOrder(b, blocks, warnings); } catch (e) {
      if (!(e instanceof OutOfBounds)) throw e;
      warnings.push('LIST is damaged: cards kept in file order');
    }
    const ids = order ?? fileOrder;
    const cards = ids.map((id) => cardsById.get(id)).filter((c): c is Card => c !== undefined);
    if (cards.length !== cardsById.size) warnings.push(`${cardsById.size - cards.length} card(s) not in the card list were dropped`);

    return {
      ok: true,
      stack: {
        format,
        version: version(sv.length > 0x6c ? sv.u32(0x6c) : 0),
        cardHeight: (sv.length > 0x1ba ? sv.u16(0x1b8) : 0) || 342,
        cardWidth: (sv.length > 0x1bc ? sv.u16(0x1ba) : 0) || 512,
        script,
        osaScript,
        blocks,
        backgrounds,
        cards,
        warnings,
      },
    };
  } catch (e) {
    if (e instanceof OutOfBounds) return { ok: false, error: 'The stack file is damaged or cut short' };
    return { ok: false, error: `Could not read the stack: ${(e as Error).message}` };
  }
}
