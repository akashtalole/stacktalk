// Builds HyperCard-style stack bytes for tests, following the same published layout as the reader.
// It proves the reader is self-consistent and safe. It does not replace testing with real stacks.

export type BPart = { id: number; kind: 1 | 2; name: string; script: string; rect: [number, number, number, number]; visible: boolean };
export type BLayer = { id: number; name: string; script: string; parts: BPart[]; contents: { partId: number; text: string }[] };
export type BCard = BLayer & { bg: number };
export type BStack = { script: string; width: number; height: number; backgrounds: BLayer[]; cards: BCard[] };

class W {
  private b: number[] = [];
  get length() { return this.b.length; }
  u8(v: number) { this.b.push(v & 0xff); return this; }
  u16(v: number) { return this.u8(v >> 8).u8(v); }
  u32(v: number) { return this.u16(v >>> 16).u16(v & 0xffff); }
  ascii(s: string) { for (const c of s) this.u8(c.charCodeAt(0)); return this; }
  cstr(s: string) { return this.ascii(s).u8(0); }
  zeros(n: number) { for (let i = 0; i < n; i++) this.u8(0); return this; }
  padTo(n: number) { return this.zeros(Math.max(0, n - this.length)); }
  even() { if (this.length % 2) this.u8(0); return this; }
  bytes(xs: number[] | Uint8Array) { for (const x of xs) this.u8(x); return this; }
  done() { return Uint8Array.from(this.b); }
}

function block(type: string, id: number, body: Uint8Array): Uint8Array {
  return new W().u32(16 + body.length).ascii(type).u32(id).u32(0).bytes(body).done();
}

function part(p: BPart): Uint8Array {
  const w = new W()
    .u16(0) // size, patched below
    .u16(p.id).u8(p.kind).u8(p.visible ? 0 : 0x80)
    .u16(p.rect[0]).u16(p.rect[1]).u16(p.rect[2]).u16(p.rect[3])
    .u8(0).u8(1) // flags, style
    .padTo(0x1e)
    .cstr(p.name).u8(0).cstr(p.script).even();
  const out = w.done();
  out[0] = out.length >> 8; out[1] = out.length & 0xff;
  return out;
}

function partsSection(l: BLayer, contentIdSign: (id: number) => number): Uint8Array {
  const parts = l.parts.map(part);
  const partBytes = new W(); for (const p of parts) partBytes.bytes(p);
  const contents = new W();
  for (const c of l.contents) {
    const textBytes = [...c.text].map((ch) => (ch === '\n' ? 13 : ch.charCodeAt(0)));
    contents.u16(contentIdSign(c.partId) & 0xffff).u16(textBytes.length + 1).u8(0).bytes(textBytes).even();
  }
  return new W()
    .u16(parts.length).u16(100).u32(partBytes.length)
    .u16(l.contents.length).u32(contents.length)
    .bytes(partBytes.done()).bytes(contents.done())
    .cstr(l.name).cstr(l.script).even()
    .done();
}

export function buildStack(s: BStack): Uint8Array {
  const stak = new W() // body starts at block offset 0x10
    .u32(10) // format: HyperCard 2.x
    .padTo(0x60 - 16).u32(0x02418000) // version at creation
    .padTo(0x6c - 16).u32(0x02418000) // version at last modification
    .padTo(0x1b8 - 16).u16(s.height).u16(s.width)
    .padTo(0x600 - 16).cstr(s.script).even();

  const bkgds = s.backgrounds.map((b) => block('BKGD', b.id, new W()
    .u32(0).u16(0).u16(0) // bitmap, flags, align  (0x10..0x17)
    .u32(0).u32(0).u32(0) // card count, next, prev (0x18..0x23)
    .bytes(partsSection(b, (id) => id))
    .done()));

  const cards = s.cards.map((c) => block('CARD', c.id, new W()
    .u32(0).u16(0).u16(0) // bitmap, flags, align (0x10..0x17)
    .zeros(8) // to 0x20
    .u32(5000).u32(c.bg) // page id, background id
    .bytes(partsSection(c, (id) => id)) // caller gives signed ids: negative = card part
    .done()));

  // One PAGE with every card, written in reverse file order so order really comes from LIST.
  const entrySize = 8;
  const page = new W().u32(4000).u32(0);
  for (const c of s.cards) page.u32(c.id).u8(0).zeros(entrySize - 5);
  const list = new W()
    .u32(1).u32(0x800).u32(s.cards.length).u16(entrySize).u16(2).u16((entrySize - 4) / 4).u16(3)
    .u32(0).u32(s.cards.length)
    .padTo(0x30 - 16).u32(5000).u16(s.cards.length);

  const tail = new W().u8(19).ascii("That's all folks...");
  const out = new W()
    .bytes(block('STAK', -1, stak.done()))
    .bytes(block('LIST', 3000, list.done()))
    .bytes(block('PAGE', 5000, page.done()));
  for (const b of bkgds) out.bytes(b);
  for (const c of [...cards].reverse()) out.bytes(c);
  out.bytes(block('TAIL', -1, tail.done()));
  return out.done();
}
