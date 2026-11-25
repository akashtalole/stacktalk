# Requirements: HyperTalk core

## Introduction
The core turns HyperTalk source into a running program. It parses, prints, and
interprets scripts, with no DOM and no network.

## Glossary
- **Script**: HyperTalk source text.
- **AST**: the tree the parser builds.
- **Host**: the interface the interpreter uses for cards, fields and dialogs.

## Requirements

### R1 Lexing
**User story:** As an author, I want my script read without case or spacing surprises.
1. WHEN the script has mixed-case keywords, THE lexer SHALL treat them as the same tokens.
2. WHEN a line has `--`, THE lexer SHALL drop the rest of that line.
3. WHEN a line ends with a continuation mark, THE lexer SHALL join it with the next line.

### R2 Parsing
**User story:** As an author, I want clear errors for bad scripts.
1. WHEN a script is valid, THE parser SHALL return an AST.
2. IF a script is invalid, THEN THE parser SHALL return an error with line and column.
3. THE parser SHALL support handlers, `put`, `get`, `go`, `answer`, `if`, and `repeat`.

### R3 Printing
**User story:** As an author, I want my script tidied in one standard form.
1. THE printer SHALL write any AST as canonical text.
2. FOR ALL valid scripts, parse then print then parse SHALL give an equal AST (round trip).
3. THE printer SHALL be idempotent: printing twice gives the same text.

### R4 Interpreting
**User story:** As an author, I want my script to do what HyperTalk would do.
1. WHEN a message is sent, THE interpreter SHALL walk the object chain and run the first matching handler.
2. WHEN `pass` runs, THE interpreter SHALL send the message to the next object.
3. WHEN a value is read as a number, THE interpreter SHALL follow the rules in `hypertalk-semantics.md`.
4. IF an operation is not valid, THEN THE interpreter SHALL stop that handler and report a plain-English error.
5. THE interpreter SHALL stop any `repeat` that passes a step limit and report a loop error.

### R5 Determinism
1. GIVEN the same script, stack and inputs, THE interpreter SHALL give the same result and effects.
2. THE core SHALL NOT read the clock, random values, or the network except through Host.

## Property-test targets
| Req | Property |
|---|---|
| R2, R3 | Round trip: `parse(print(parse(s)))` equals `parse(s)` for generated scripts |
| R3 | Printing is idempotent |
| R1 | Case changes in keywords never change the AST |
| R4 | Random valid programs never throw, and always end or hit the step limit |
| R4 | Arithmetic matches a small reference model on random number strings |
| R5 | Run twice with the same seed gives equal effect logs |
