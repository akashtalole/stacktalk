import fc from 'fast-check';
import { parse, parseExpression } from '../../src/core/parser';
import { script } from './gen';

const vocab = [
  'on', 'end', 'put', 'into', 'get', 'go', 'to', 'card', 'field', 'answer', 'pass', 'if', 'then',
  'else', 'repeat', 'with', 'while', 'times', 'and', 'or', 'not', 'is', 'x', 'y', 'mouseUp',
  '1', '2', '"a"', '+', '-', '*', '&', '&&', '=', '<>', '(', ')', ',', '\n',
];

describe('parser properties', () => {
  // R2: any input gives a Result. The parser never throws.
  it('never throws on any text', () => {
    fc.assert(fc.property(fc.string({ maxLength: 120 }), (s) => {
      const r = parse(s);
      return r.ok === true || r.ok === false;
    }));
  });

  // R2: near-valid token soup is the hard case for a parser. Still no throw.
  it('never throws on HyperTalk-like token soup', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...vocab), { maxLength: 40 }), (toks) => {
      const r = parse(toks.join(' '));
      return r.ok === true || r.ok === false;
    }), { numRuns: 2000 });
  });

  // R2.2: errors always carry a position inside the source.
  it('errors point inside the source', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...vocab), { minLength: 1, maxLength: 30 }), (toks) => {
      const src = toks.join(' ');
      const r = parse(src);
      if (r.ok) return true;
      const lines = src.split('\n').length;
      return r.error.line >= 1 && r.error.line <= lines && r.error.col >= 1;
    }), { numRuns: 1000 });
  });

  it('deep nesting returns an error, not a crash', () => {
    const r = parseExpression('('.repeat(5000) + '1' + ')'.repeat(5000));
    expect(r.ok).toBe(false);
  });

  // Smoke test that the generators used by the printer round trip work.
  it('AST generator produces handlers', () => {
    fc.assert(fc.property(script, (s) => Array.isArray(s.handlers)), { numRuns: 50 });
  });
});
