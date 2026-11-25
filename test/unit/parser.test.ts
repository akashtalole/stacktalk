import { parse, parseExpression } from '../../src/core/parser';
import type { Expr, Script } from '../../src/core/ast';

const ok = (src: string): Script => {
  const r = parse(src);
  if (!r.ok) throw new Error(`${r.error.message} at ${r.error.line}:${r.error.col}`);
  return r.value;
};
const expr = (src: string): Expr => {
  const r = parseExpression(src);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};
const body = (src: string) => ok(`on test\n${src}\nend test`).handlers[0]!.body;

describe('parser: handlers', () => {
  it('parses a handler with params', () => {
    expect(ok('on greet who, times2\nend greet')).toEqual({
      handlers: [{ name: 'greet', params: ['who', 'times2'], body: [] }],
    });
  });
  it('folds handler name case', () => {
    expect(ok('on mouseUp\nend MOUSEUP').handlers[0]!.name).toBe('mouseup');
  });
  it('rejects a wrong end name with position', () => {
    expect(parse('on a\nend b')).toEqual({
      ok: false, error: { message: 'Expected "end a"', line: 2, col: 5 },
    });
  });
  it('parses several handlers with blank lines', () => {
    expect(ok('\non a\nend a\n\non b\nend b\n').handlers.map((h) => h.name)).toEqual(['a', 'b']);
  });
});

describe('parser: statements', () => {
  it('put into, before, after', () => {
    expect(body('put 1 into x\nput "a" before field "f"\nput 2 after card field 3')).toEqual([
      { t: 'put', value: { t: 'num', v: '1' }, mode: 'into', target: { t: 'var', name: 'x' } },
      { t: 'put', value: { t: 'str', v: 'a' }, mode: 'before', target: { t: 'field', card: false, ref: { t: 'str', v: 'f' } } },
      { t: 'put', value: { t: 'num', v: '2' }, mode: 'after', target: { t: 'field', card: true, ref: { t: 'num', v: '3' } } },
    ]);
  });
  it('put needs a mode', () => {
    expect(parse('on t\nput 1 x\nend t').ok).toBe(false);
  });
  it('put target must be a container', () => {
    expect(parse('on t\nput 1 into 2\nend t').ok).toBe(false);
  });
  it('get, go, answer, pass', () => {
    expect(body('get 1\ngo to card 2\ngo cd "Home"\nanswer "Boo!"\npass mouseUp')).toEqual([
      { t: 'get', value: { t: 'num', v: '1' } },
      { t: 'go', card: { t: 'num', v: '2' } },
      { t: 'go', card: { t: 'str', v: 'Home' } },
      { t: 'answer', value: { t: 'str', v: 'Boo!' } },
      { t: 'pass', name: 'mouseup' },
    ]);
  });
  it('message send with args', () => {
    expect(body('beep\ngreet "Ann", 2')).toEqual([
      { t: 'send', name: 'beep', args: [] },
      { t: 'send', name: 'greet', args: [{ t: 'str', v: 'Ann' }, { t: 'num', v: '2' }] },
    ]);
  });
});

describe('parser: if', () => {
  const a = { t: 'answer', value: { t: 'num', v: '1' } };
  const b = { t: 'answer', value: { t: 'num', v: '2' } };
  const cond = { t: 'var', name: 'x' };
  it('single line', () => {
    expect(body('if x then answer 1')).toEqual([{ t: 'if', cond, then: [a] }]);
  });
  it('single line with else on same line', () => {
    expect(body('if x then answer 1 else answer 2')).toEqual([{ t: 'if', cond, then: [a], else: [b] }]);
  });
  it('single line with else on next line', () => {
    expect(body('if x then answer 1\nelse answer 2')).toEqual([{ t: 'if', cond, then: [a], else: [b] }]);
  });
  it('multi line with end if', () => {
    expect(body('if x then\nanswer 1\nelse\nanswer 2\nend if')).toEqual([{ t: 'if', cond, then: [a], else: [b] }]);
  });
  it('then on the next line', () => {
    expect(body('if x\nthen answer 1')).toEqual([{ t: 'if', cond, then: [a] }]);
  });
  it('multi line needs end if', () => {
    expect(parse('on t\nif x then\nanswer 1\nend t').ok).toBe(false);
  });
});

describe('parser: repeat', () => {
  const kind = (src: string) => (body(`${src}\nend repeat`)[0] as { kind: unknown }).kind;
  it('forms', () => {
    expect(kind('repeat')).toEqual({ k: 'forever' });
    expect(kind('repeat 3 times')).toEqual({ k: 'times', n: { t: 'num', v: '3' } });
    expect(kind('repeat for 3 times')).toEqual({ k: 'times', n: { t: 'num', v: '3' } });
    expect(kind('repeat while x')).toEqual({ k: 'while', cond: { t: 'var', name: 'x' } });
    expect(kind('repeat until x')).toEqual({ k: 'until', cond: { t: 'var', name: 'x' } });
    expect(kind('repeat with i = 1 to 10')).toEqual({
      k: 'with', name: 'i', from: { t: 'num', v: '1' }, to: { t: 'num', v: '10' }, down: false,
    });
    expect(kind('repeat with i = 10 down to 1')).toMatchObject({ k: 'with', down: true });
  });
});

describe('parser: expressions', () => {
  it('* binds tighter than +', () => {
    expect(expr('1 + 2 * 3')).toEqual({
      t: 'bin', op: '+', l: { t: 'num', v: '1' },
      r: { t: 'bin', op: '*', l: { t: 'num', v: '2' }, r: { t: 'num', v: '3' } },
    });
  });
  it('+ binds tighter than &', () => {
    expect(expr('"n" & 1 + 2')).toMatchObject({ op: '&', r: { op: '+' } });
  });
  it('& binds tighter than =, and = tighter than and', () => {
    expect(expr('a & b = c and d')).toMatchObject({ op: 'and', l: { op: '=', l: { op: '&' } } });
  });
  it('is and is not', () => {
    expect(expr('a is b')).toMatchObject({ op: '=' });
    expect(expr('a is not b')).toMatchObject({ op: '<>' });
  });
  it('^ is right associative', () => {
    expect(expr('2 ^ 3 ^ 2')).toMatchObject({ op: '^', l: { v: '2' }, r: { op: '^' } });
  });
  it('unary minus and not', () => {
    expect(expr('- x')).toEqual({ t: 'un', op: '-', e: { t: 'var', name: 'x' } });
    expect(expr('not x')).toEqual({ t: 'un', op: 'not', e: { t: 'var', name: 'x' } });
  });
  it('parens and div/mod', () => {
    expect(expr('(1 + 2) div 3 mod 2')).toMatchObject({ op: 'mod', l: { op: 'div', l: { op: '+' } } });
  });
  it('reports a missing paren', () => {
    expect(parseExpression('(1 + 2')).toMatchObject({ ok: false, error: { message: 'Expected ")"' } });
  });
});
