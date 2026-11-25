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

// Full definitions: src/core/ast.ts (source of truth).
type Expr = str | num | var | field(card?, ref) | un(- | not) | bin(op)
// op: + - * / div mod ^ & && = <> < > <= >= and or   ("is" = "=", "is not" = "<>")
type Stmt = put | get | go | answer | pass | send(name, args) | if | repeat
type RepeatKind = forever | times | while | until | with(i = a [down] to b)
type Handler = { name: string; params: string[]; body: Stmt[] };

// Precedence, low to high: or, and, = <>, < > <= >=, & &&, + -, * / div mod, ^ (right), unary - not

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
