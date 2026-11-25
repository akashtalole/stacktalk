# Requirements: LLM helper (optional)

## Introduction
An optional helper turns plain English into HyperTalk, and explains script errors.
It lives in `src/ai/` and is never imported by `src/core/`.

## Requirements

### A1 Generate
1. WHEN the user types a request such as "make this button count clicks", THE helper SHALL return a HyperTalk script.
2. THE helper SHALL parse its own output with the core parser before showing it.
3. IF the output does not parse, THEN THE helper SHALL retry up to 2 times with the parse error, then show a plain failure message.

### A2 Explain
1. WHEN a script errors, THE helper SHALL offer a short plain-English fix idea.

### A3 Safety and privacy
1. THE helper SHALL send only the selected script and the request, never the whole stack, unless the user opts in.
2. THE helper SHALL work with no key set: the buttons are hidden and the app still runs.
3. THE helper SHALL never run generated code without the user pressing Apply.

### A4 Provider
1. THE helper SHALL call a model through one `LlmClient` interface, so a test fake can replace it.
2. The default client SHALL use Amazon Bedrock through the Converse API.

## Property-test targets
- Any fake output that parses is accepted; any that does not is never applied.
- Retry count never exceeds 2.
