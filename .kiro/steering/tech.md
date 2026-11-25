---
inclusion: always
---
# StackTalk: tech rules

- Language: TypeScript, `strict: true`. No `any`.
- Build: Vite. Tests: Vitest. Property tests: fast-check.
- The core (`src/core`) has zero DOM and zero network imports. It must run in Node.
- Pure functions first. Side effects go through an injected `Host` interface.
- Every public function has a unit test. Every parser/interpreter rule has a property test.
- Never guess HyperTalk syntax. If a rule is not in `hypertalk-semantics.md`
  or the spec, ask or add it to the spec first.
- Errors are values: return `Result<T, StackTalkError>`. Do not throw in the core.
- Commands: `npm test`, `npm run test:props`, `npm run lint`.
