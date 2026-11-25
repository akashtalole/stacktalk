import { lex } from '../../src/core/lexer';

const texts = (src: string) => {
  const r = lex(src);
  if (!r.ok) throw new Error(r.error.message);
  return r.value.map((t) => `${t.kind}:${t.text}`);
};

describe('lexer', () => {
  it('folds word case (R1.1)', () => {
    expect(texts('Put X')).toEqual(['word:put', 'word:x', 'eof:']);
  });
  it('keeps string case', () => {
    expect(texts('answer "Boo!"')).toEqual(['word:answer', 'string:Boo!', 'eof:']);
  });
  it('drops comments (R1.2)', () => {
    expect(texts('put 1 -- note\nget 2')).toEqual([
      'word:put', 'number:1', 'newline:\n', 'word:get', 'number:2', 'eof:',
    ]);
  });
  it('joins continued lines (R1.3)', () => {
    expect(texts('put 1 \\\n into x')).toEqual([
      'word:put', 'number:1', 'word:into', 'word:x', 'eof:',
    ]);
    expect(texts('put 1 ¬\ninto x')).toEqual(['word:put', 'number:1', 'word:into', 'word:x', 'eof:']);
  });
  it('lexes operators, longest first', () => {
    expect(texts('a && b & c <= 3')).toEqual([
      'word:a', 'op:&&', 'word:b', 'op:&', 'word:c', 'op:<=', 'number:3', 'eof:',
    ]);
  });
  it('reports position on bad input', () => {
    const r = lex('put 1\n  @');
    expect(r).toEqual({ ok: false, error: { message: `Can't understand "@"`, line: 2, col: 3 } });
  });
  it('reports an unterminated quote', () => {
    const r = lex('answer "oops');
    expect(r.ok).toBe(false);
  });
});
