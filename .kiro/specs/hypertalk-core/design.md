# Design: HyperTalk core

## Overview
Four pure stages: lexer, parser, printer, interpreter. The interpreter talks to the
outside world only through `Host`.

```
source -> lexer -> tokens -> parser -> AST -> interpreter <-> Host
                                       AST -> printer -> source
```

## Types
```ts
type Result<T, E = StackTalkError> = { ok: true; value: T } | { ok: false; error: E };
type StackTalkError = { message: string; line: number; col: number };

type Expr =
  | { t: 'str'; v: string } | { t: 'num'; v: string }
  | { t: 'var'; name: string }
  | { t: 'bin'; op: '+'|'-'|'*'|'/'|'&'|'&&'|'='|'<'|'>'; l: Expr; r: Expr }
  | { t: 'field'; name: string };

type Stmt =
  | { t: 'put'; value: Expr; mode: 'into'|'before'|'after'; target: Expr }
  | { t: 'get'; value: Expr }
  | { t: 'go'; card: Expr }
  | { t: 'answer'; value: Expr }
  | { t: 'pass'; name: string }
  | { t: 'if'; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { t: 'repeat'; kind: RepeatKind; body: Stmt[] };

type Handler = { name: string; params: string[]; body: Stmt[] };

interface Host {
  getField(name: string): string;
  setField(name: string, value: string): void;
  goCard(ref: string): Result<void>;
  answer(text: string): void;
  parentOf(objectId: string): string | null;
  handlersOf(objectId: string): Handler[];
}
```

## Interpreter
- `send(msg, objectId)` loops up the chain using `host.parentOf`.
- State: variables map, `it`, step counter (limit default 100000).
- Effects are recorded in an ordered log, so tests can compare runs.

## Error handling
Core returns `Result`. The web layer shows `error.message` in a spooky dialog.

## Testing strategy
- Unit tests for each statement and error case.
- Property tests from the table in `requirements.md`, using fast-check
  generators that build valid ASTs, then print them to source.
- Use one fixed seed in CI and a random seed locally.
