import fc from 'fast-check';
import { lex } from '../../src/core/lexer';

const word = fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_]{0,8}$/);

const scramble = (s: string, bits: boolean[]) =>
  [...s].map((c, i) => (bits[i % bits.length] ? c.toUpperCase() : c.toLowerCase())).join('');

describe('lexer properties', () => {
  // R1.1: keyword case never changes the tokens.
  it('word case never changes tokens', () => {
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 6 }), fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        (words, bits) => {
          const a = lex(words.join(' '));
          const b = lex(words.map((w) => scramble(w, bits)).join(' '));
          expect(a).toEqual(b);
        }),
    );
  });

  // R1.2: a trailing comment never changes the tokens.
  it('trailing comment is ignored', () => {
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 5 }), fc.string({ maxLength: 20 }),
        (words, note) => {
          const body = words.join(' ');
          const cleanNote = note.replace(/[\r\n]/g, ' ');
          // The eof token sits at a different column, so compare kind and text only.
          const shape = (r: ReturnType<typeof lex>) =>
            r.ok ? r.value.map((t) => [t.kind, t.text]) : r;
          expect(shape(lex(`${body} --${cleanNote}`))).toEqual(shape(lex(body)));
        }),
    );
  });

  // Robustness: any input returns a Result, never throws.
  it('never throws on any text', () => {
    fc.assert(fc.property(fc.string({ maxLength: 80 }), (s) => {
      const r = lex(s);
      return r.ok === true || r.ok === false;
    }));
  });
});
