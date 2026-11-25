import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { readStack, macRoman } from '../src/reader.js';
import { toStackTalk } from '../src/convert.js';
import { lookup } from '../src/reference.js';
import { buildStack, BStack, BPart } from './build.js';

const sample: BStack = {
  script: 'on openStack\n  answer "Welcome"\nend openStack',
  width: 640, height: 480,
  backgrounds: [{
    id: 2000, name: 'Crypt', script: '',
    parts: [{ id: 1, kind: 2, name: 'Title', script: '', rect: [10, 10, 40, 200], visible: true }],
    contents: [{ partId: 1, text: 'shared' }],
  }],
  cards: [
    { id: 100, bg: 2000, name: 'First', script: 'on openCard\nend openCard',
      parts: [{ id: 3, kind: 1, name: 'Boo', script: 'on mouseUp\n  answer "Boo!"\nend mouseUp', rect: [50, 20, 70, 100], visible: true }],
      contents: [{ partId: -3, text: '' }, { partId: 1, text: 'card 1 title' }] },
    { id: 101, bg: 2000, name: 'Second', script: '', parts: [], contents: [] },
  ],
};

describe('readStack', () => {
  const r = readStack(buildStack(sample));
  if (!r.ok) throw new Error(r.error);
  const s = r.stack;

  it('reads the stack header', () => {
    expect(s.format).toBe(10);
    expect(s.version).toBe('2.4.1');
    expect([s.cardWidth, s.cardHeight]).toEqual([640, 480]);
    expect(s.script).toBe(sample.script);
  });
  it('orders cards from LIST, not file order', () => {
    expect(s.cards.map((c) => c.name)).toEqual(['First', 'Second']);
  });
  it('reads parts, scripts and text', () => {
    const b = s.cards[0]!.parts[0]!;
    expect(b).toMatchObject({ id: 3, kind: 'button', name: 'Boo', visible: true, rect: { top: 50, left: 20, bottom: 70, right: 100 } });
    expect(b.script).toContain('answer "Boo!"');
    expect(s.cards[0]!.text.bg[1]).toBe('card 1 title');
    expect(s.backgrounds[0]!.text.bg[1]).toBe('shared');
  });
  it('converts to StackTalk JSON', () => {
    const j = toStackTalk(s, 'Haunted');
    expect(j.cards[0]!.buttons[0]!.rect).toEqual([20, 50, 80, 20]);
    expect(j.cards[0]!.backgroundText).toEqual({ 1: 'card 1 title' });
    expect(j.backgrounds[0]!.fields[0]!.text).toBe('shared');
  });
  it('skips a MacBinary header', () => {
    const wrapped = new Uint8Array(128 + buildStack(sample).length);
    wrapped.set(buildStack(sample), 128);
    const w = readStack(wrapped);
    expect(w.ok && w.stack.warnings).toContain('MacBinary header skipped');
  });
  it('rejects a non-stack and a cut file', () => {
    expect(readStack(new TextEncoder().encode('hello world, not a stack')).ok).toBe(false);
    expect(readStack(buildStack(sample).subarray(0, 700)).ok).toBe(false);
  });
  it('decodes MacRoman and CR line ends', () => {
    expect(macRoman(Uint8Array.from([0x8e, 0x0d, 0x41]))).toBe('é\nA');
  });
  it('looks up commands', () => {
    expect(lookup('PUT')).toContain('put <value>');
    expect(lookup('nope')).toBeNull();
  });
});

// ---- property tests (M "Property-test targets") ----
const ascii = fc.stringMatching(/^[A-Za-z0-9 "!?.\n]{0,30}$/);
const partArb = (id: number): fc.Arbitrary<BPart> => fc.record({
  id: fc.constant(id), kind: fc.constantFrom<1 | 2>(1, 2), name: fc.stringMatching(/^[A-Za-z ]{0,12}$/), script: ascii,
  rect: fc.tuple(fc.nat(400), fc.nat(400), fc.nat(400), fc.nat(400)), visible: fc.boolean(),
});
const stackArb: fc.Arbitrary<BStack> = fc.record({
  script: ascii, width: fc.integer({ min: 1, max: 2000 }), height: fc.integer({ min: 1, max: 2000 }),
  nParts: fc.nat(4), nCards: fc.integer({ min: 1, max: 6 }), seedText: fc.array(ascii, { minLength: 30, maxLength: 30 }),
}).chain(({ script, width, height, nParts, nCards, seedText }) =>
  fc.tuple(
    fc.tuple(...Array.from({ length: nParts }, (_, i) => partArb(i + 1))),
    fc.array(fc.stringMatching(/^[A-Za-z ]{0,10}$/), { minLength: nCards, maxLength: nCards }),
  ).map(([parts, names]) => ({
    script, width, height,
    backgrounds: [{ id: 2000, name: 'bg', script: '', parts: [...parts], contents: [] }],
    cards: names.map((name, i) => ({
      id: 100 + i, bg: 2000, name, script: seedText[i] ?? '', parts: [],
      contents: parts.map((p, k) => ({ partId: p.id, text: seedText[(i * 5 + k) % 30] ?? '' })),
    })),
  })));

describe('reader properties', () => {
  it('random bytes never crash the reader', () => {
    fc.assert(fc.property(fc.uint8Array({ maxLength: 4096 }), (b) => {
      const r = readStack(b);
      return r.ok === true || r.ok === false;
    }), { numRuns: 3000 });
  });

  it('random bytes after a STAK header never crash the reader', () => {
    fc.assert(fc.property(fc.uint8Array({ minLength: 8, maxLength: 4096 }), fc.nat(), (b, n) => {
      const x = Uint8Array.from(b);
      const size = 16 + (n % Math.max(1, x.length));
      x.set([size >>> 24 & 255, size >>> 16 & 255, size >>> 8 & 255, size & 255, 83, 84, 65, 75]);
      const r = readStack(x);
      return r.ok === true || r.ok === false;
    }), { numRuns: 3000 });
  });

  it('a damaged real-shaped stack never crashes the reader', () => {
    fc.assert(fc.property(stackArb, fc.array(fc.tuple(fc.nat(), fc.nat(255)), { minLength: 1, maxLength: 20 }), (s, flips) => {
      const b = buildStack(s);
      for (const [pos, val] of flips) b[pos % b.length] = val;
      const r = readStack(b);
      return r.ok === true || r.ok === false;
    }), { numRuns: 300 });
  });

  it('generated stacks round trip', () => {
    fc.assert(fc.property(stackArb, (s) => {
      const r = readStack(buildStack(s));
      if (!r.ok) throw new Error(r.error);
      const st = r.stack;
      expect(st.script).toBe(s.script);
      expect([st.cardWidth, st.cardHeight]).toEqual([s.width, s.height]);
      expect(st.cards.map((c) => [c.id, c.name, c.script])).toEqual(s.cards.map((c) => [c.id, c.name, c.script]));
      expect(st.backgrounds[0]!.parts.map((p) => [p.id, p.name, p.script, p.visible]))
        .toEqual(s.backgrounds[0]!.parts.map((p) => [p.id, p.name, p.script, p.visible]));
      for (const [i, c] of s.cards.entries()) {
        for (const ct of c.contents) expect(st.cards[i]!.text.bg[ct.partId]).toBe(ct.text);
      }
    }), { numRuns: 300 });
  });
});
