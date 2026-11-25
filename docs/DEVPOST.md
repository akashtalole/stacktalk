# StackTalk 🪦 — HyperCard, raised from the dead

**Category:** Resurrection
**Tagline:** Dig up a 1987 HyperCard stack, and it runs again in your browser.

> Draft. Lines marked **TODO** need real numbers or facts before you submit.
> Keep every claim true. Judges can read the `.kiro` folder.

## Inspiration
HyperCard let ordinary people build software in 1987. Teachers, artists and kids made
"stacks" of cards with buttons and wrote scripts in HyperTalk, a language that reads
like English. Myst began as HyperCard stacks. Then Apple stopped selling it in 2004.
Thousands of stacks now sit in archives that nothing modern can open.

We wanted to bring them back. Not as screenshots, but as programs you can click and edit.

## What it does
- **Reads old stack files.** A custom MCP server, `stackfile`, opens HyperCard 2.x
  binary stacks. It walks the block format and pulls out cards, backgrounds, buttons,
  fields, text and every script.
- **Runs HyperTalk.** A new TypeScript interpreter runs the scripts: handlers, the
  message chain, `put`, `go`, `answer`, `if`, `repeat`.
- **Shows the stack in a browser,** with a dark, haunted look and an edit mode.
- **Helps you write new scripts.** An optional AI helper turns "make this button count
  clicks" into HyperTalk. It checks its own output with our parser before you see it.

**TODO:** add a GIF of a real stack running, and the demo video link.

## How we built it with Kiro

### Spec-driven development
We wrote four specs in `.kiro/specs/`: `hypertalk-core`, `stacktalk-web-ui`,
`stacktalk-ai-helper` and `stackfile-mcp`. Each one has EARS requirements, a design
and a task list. Every requirement names the property test that proves it.

A language runtime is a bad place to vibe code. One wrong rule about precedence or
line endings breaks every program after it. The spec gave Kiro a fixed target. The
parser's 24 unit tests passed on the first run, because the tests and the code came
from the same requirements.

**Spec vs vibe coding:** **TODO.** Build one small feature both ways and compare the
bugs and time. Record it in `docs/KIRO_LOG.md`.

### Steering docs
- `product.md`, `tech.md` and `structure.md` load every time.
- `hypertalk-semantics.md` loads only when Kiro edits `src/core/**`. It is the source
  of truth for the language.

The rule that made the biggest difference is in `tech.md`: *never guess HyperTalk syntax.
If a rule is missing, ask or add it to the spec first.* This stopped the agent from
inventing plausible but wrong HyperTalk.

### Agent hooks
- **Test on save:** when a core file changes, Kiro runs the unit and property tests.
  If a property fails, it explains the shrunk counterexample and names the spec rule it
  breaks. It may not edit tests to make them pass.
- **Spec drift:** when a `requirements.md` changes, Kiro lists any requirement with no
  task and any task with no requirement.

**TODO:** how many times each hook fired and what it caught.

### Custom agents
In `.kiro/agents/`:
- `necromancer` builds one task at a time, test first, and stops if a rule is missing.
- `reviewer` is read-only. It maps each change to a requirement and flags gaps.
- `scribe` keeps `docs/KIRO_LOG.md` up to date, facts only.

**TODO:** which Kiro app ran each agent and what it changed.

### MCP
HyperCard stacks are a binary format that was never published. No model can read one
from raw bytes. The `stackfile` MCP server gives Kiro five tools: `inspect_stack`,
`get_card`, `extract_scripts`, `convert_stack` and `lookup_command`.

With it, Kiro can open a real 1990s stack, read its scripts, and use them as test cases
for our interpreter. Without it, the agent could only guess. The server reads only, is
locked to an allowed folder (symlinks resolved), and caps file size at 50 MB.

### Property-based testing
We used fast-check for every rule we could state as "for all inputs".
- **Lexer:** changing keyword case never changes the tokens. A trailing comment never
  changes them either. Any text gives a result and never a crash.
- **Parser:** 2,000 runs of HyperTalk-like token soup never throw. Every error points
  inside the source. Parentheses nested 5,000 deep give an error, not a stack overflow.
- **Stack reader:** random bytes, and real-shaped stacks with random bytes changed,
  never crash it. Generated stacks round trip with all names, scripts and text intact.

**What PBT caught:** the first lexer property run failed. The test compared the
end-of-file position, which moves when a comment is added. It was a bug in our test,
not the lexer, but it showed us exactly what "equal" had to mean.
**TODO:** add any real bugs found later (the printer round trip is the likely place).

### Kiro powers
**TODO:** list the powers used and what they gave you, for example AWS powers for the
Bedrock helper or deployment. Say if you package the StackTalk setup as a power.

### Kiro IDE, CLI, Web and Crew
- **Kiro Crew:** planning, specs, scaffolding, the lexer, the parser and the MCP reader.
- **Kiro IDE:** **TODO**
- **Kiro CLI:** **TODO** (for example, running the test hook in CI)
- **Kiro Web:** **TODO**

## Challenges we ran into
- The HyperCard format is not official. We worked from the community's reverse-engineered
  notes. Text is in MacRoman with old Mac line endings. Card order lives in separate
  LIST and PAGE blocks, not in file order.
- HyperTalk has two `if` forms, and `else` can sit on the same line or the next one.
- **TODO:** add real problems from the rest of the build.

## Accomplishments we're proud of
- A HyperTalk parser with plain-English errors that never crashes on any input.
- A safe, read-only MCP server for a file format that has been dead for 20 years.
- **TODO:** "We ran <stack name> from <year> unchanged."

## What we learned
**TODO.**

## What's next
- Decode HyperCard pictures (the WOBA bitmap format).
- Import HyperCard 1.x stacks.
- A public gallery of resurrected stacks.

## Built with
TypeScript, Vite, Vitest, fast-check, Model Context Protocol SDK, Amazon Bedrock, Kiro.
