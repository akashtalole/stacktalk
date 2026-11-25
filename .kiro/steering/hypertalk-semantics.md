---
inclusion: fileMatch
fileMatchPattern: "src/core/**"
---
# HyperTalk semantics (source of truth for the core)

Add rules here before coding them. Mark each rule as `verified` once a test covers it.

## Lexing
- Keywords and names are case-insensitive. `Put` equals `put`.
- A line ends a statement. `¬` (or `\` in our ASCII form) continues a line.
- Comments start with `--` and run to end of line.

## Handlers
- `on <name> [params]` ... `end <name>` defines a handler.
- A message goes to a button, then its card, then its background, then the stack.
- `pass <name>` sends the message up to the next object.

## Values
- Everything is a string. Numbers are strings that parse as numbers.
- `"2" + "3"` is `5`. `"a" + 1` is a runtime error: `Can't understand arguments of +`.
- `&` joins text. `&&` joins text with one space.

## Commands (v1)
- `put <expr> [into|before|after] <container>`
- `get <expr>`  (sets `it`)
- `go [to] card <n|name>`
- `answer <expr>` (shows a dialog through Host)
- `if <cond> then ... [else ...] end if`
- `repeat [n times | while <cond> | with i = a to b]` ... `end repeat`

## Containers
- `it`, variables, `field "name"`, `card field "name"`.
- Unset variables hold their own name as text (a classic quirk). Keep it.

## Verified rules
(none yet)
