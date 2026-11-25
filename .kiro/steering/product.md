---
inclusion: always
---
# StackTalk: product

StackTalk brings back HyperCard-style "stacks" as a web runtime. Authors write
scripts in HyperTalk, an English-like language. An optional LLM helper fills gaps.

## Goals
- Run classic HyperTalk handlers in the browser, in a deterministic way.
- Make stacks (cards, buttons, fields) easy to build and share as one JSON file.
- Keep the LLM helper optional. The core runtime never calls a model.

## Non-goals
- Pixel-exact copy of the 1987 UI.
- Binary import of old `.stack` files (a later MCP server does this).

## Voice
Friendly and a little spooky. Error messages are plain English, like HyperTalk's own.
