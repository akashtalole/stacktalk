# Design: LLM helper

```ts
interface LlmClient { complete(system: string, user: string): Promise<string>; }

async function generateScript(req: string, ctx: {script?: string}, llm: LlmClient,
  parse: (s: string) => Result<unknown>): Promise<Result<string>>
```
- System prompt holds the verified rules from `hypertalk-semantics.md` (read at build time).
- Loop: ask, parse, on failure append the parse error, ask again (max 2 retries).
- `BedrockClient` implements `LlmClient`. `FakeClient` is used in tests.
- Keys and region come from environment variables. Nothing is stored in the stack file.

## Tasks
- [ ] 1. `LlmClient`, `FakeClient`, `generateScript` with retry (A1, A3)
  - [ ]* 1.1 Property tests for accept/reject and retry limit
- [ ] 2. `explainError` (A2)
- [ ] 3. `BedrockClient` (A4)
- [ ] 4. UI buttons, hidden when no key (A3)
