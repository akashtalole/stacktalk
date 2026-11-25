// fast-check generators for valid ASTs (task 3.2). Used by printer round-trip tests (task 5).
import fc from 'fast-check';
import { BinOp, Expr, Handler, KEYWORDS, PutMode, Script, Stmt } from '../../src/core/ast';

export const name = fc
  .stringMatching(/^[a-z][a-z0-9_]{0,6}$/)
  .filter((s) => !KEYWORDS.has(s) && s !== 'forever');

const binOps: BinOp[] = ['+', '-', '*', '/', 'div', 'mod', '^', '&', '&&', '=', '<>', '<', '>', '<=', '>=', 'and', 'or'];

export const expr: fc.Arbitrary<Expr> = fc.letrec<{ e: Expr }>((tie) => ({
  e: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.stringMatching(/^[A-Za-z0-9 !?.]{0,10}$/).map((v): Expr => ({ t: 'str', v })),
    fc.nat(9999).map((n): Expr => ({ t: 'num', v: String(n) })),
    name.map((n): Expr => ({ t: 'var', name: n })),
    fc.record({ card: fc.boolean(), ref: fc.oneof(
      fc.stringMatching(/^[A-Za-z ]{1,8}$/).map((v): Expr => ({ t: 'str', v })),
      fc.nat(20).map((n): Expr => ({ t: 'num', v: String(n) })),
    ) }).map(({ card, ref }): Expr => ({ t: 'field', card, ref })),
    fc.record({ op: fc.constantFrom<'-' | 'not'>('-', 'not'), e: tie('e') })
      .map(({ op, e }): Expr => ({ t: 'un', op, e })),
    fc.record({ op: fc.constantFrom(...binOps), l: tie('e'), r: tie('e') })
      .map(({ op, l, r }): Expr => ({ t: 'bin', op, l, r })),
  ),
})).e;

const container: fc.Arbitrary<Expr> = fc.oneof(
  name.map((n): Expr => ({ t: 'var', name: n })),
  fc.stringMatching(/^[A-Za-z]{1,8}$/).map((v): Expr => ({ t: 'field', card: true, ref: { t: 'str', v } })),
);

export const stmt: fc.Arbitrary<Stmt> = fc.letrec<{ s: Stmt; body: Stmt[] }>((tie) => ({
  body: fc.array(tie('s'), { maxLength: 3 }),
  s: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.record({ value: expr, mode: fc.constantFrom<PutMode>('into', 'before', 'after'), target: container })
      .map((r): Stmt => ({ t: 'put', ...r })),
    expr.map((value): Stmt => ({ t: 'get', value })),
    expr.map((card): Stmt => ({ t: 'go', card })),
    expr.map((value): Stmt => ({ t: 'answer', value })),
    name.map((n): Stmt => ({ t: 'pass', name: n })),
    fc.record({ name, args: fc.array(expr, { maxLength: 3 }) }).map((r): Stmt => ({ t: 'send', ...r })),
    fc.record({ cond: expr, then: tie('body'), else: fc.option(tie('body'), { nil: undefined }) })
      .map(({ cond, then, else: e }): Stmt => (e === undefined ? { t: 'if', cond, then } : { t: 'if', cond, then, else: e })),
    fc.record({ n: expr, body: tie('body') }).map(({ n, body }): Stmt => ({ t: 'repeat', kind: { k: 'times', n }, body })),
    fc.record({ cond: expr, body: tie('body') }).map(({ cond, body }): Stmt => ({ t: 'repeat', kind: { k: 'while', cond }, body })),
    fc.record({ name, from: expr, to: expr, down: fc.boolean(), body: tie('body') })
      .map(({ name: n, from, to, down, body }): Stmt => ({ t: 'repeat', kind: { k: 'with', name: n, from, to, down }, body })),
  ),
})).s;

export const handler: fc.Arbitrary<Handler> = fc.record({
  name,
  params: fc.uniqueArray(name, { maxLength: 3 }),
  body: fc.array(stmt, { maxLength: 4 }),
});

export const script: fc.Arbitrary<Script> = fc.array(handler, { maxLength: 3 }).map((handlers) => ({ handlers }));
