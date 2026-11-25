# Kiro usage log

Facts only. Add numbers when we have them. Used for the Devpost write-up.

| Date | Feature | What it did | Result |
|---|---|---|---|
| 2026-11-25 | Steering | `product`, `tech`, `structure`, `hypertalk-semantics` files | Rules in every session; semantics loads only for `src/core/**` |
| 2026-11-25 | Spec | `hypertalk-core`, `stacktalk-web-ui`, `stacktalk-ai-helper`, `stackfile-mcp` | Requirements in EARS form with property-test targets |
| 2026-11-25 | Hooks | `test-on-save`, `spec-drift` | Not yet measured |
| 2026-11-25 | Custom agents | `necromancer`, `reviewer`, `scribe` | Not yet measured |
| 2026-11-25 | Property tests | Lexer: case folding, comments, never-throws | First run failed: comment test compared EOF column. Test bug, not lexer bug. |
| 2026-11-25 | MCP | `stackfile` server skeleton | 5 tools list over stdio; path allowlist works; tools return "not built yet" |

## Which Kiro app did what
- IDE: (fill in)
- CLI: (fill in)
- Web: (fill in)
- Crew: planning, scaffold, first tasks

## Spec vs vibe coding
Pick one feature to build both ways. Record bugs and time for each.
- Spec-built feature: (fill in)
- Vibe-coded feature: (fill in)

## Bugs that property tests found
(none yet)
