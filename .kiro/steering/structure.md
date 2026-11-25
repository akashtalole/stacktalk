---
inclusion: always
---
# StackTalk: layout

```
src/core/lexer.ts        text -> tokens
src/core/parser.ts       tokens -> AST
src/core/printer.ts      AST -> canonical text
src/core/interpreter.ts  AST + Host -> effects
src/core/host.ts         Host interface (cards, fields, messages)
src/web/                 browser UI (cards, buttons, fields)
src/ai/                  optional LLM helper (never imported by core)
test/unit/               example tests
test/props/              fast-check property tests
.kiro/specs/             one folder per feature
```

One spec per feature, named `hypertalk-<feature>`.
