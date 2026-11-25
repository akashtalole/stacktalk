# Requirements: HyperCard stack MCP server

## Introduction
An MCP server that reads old HyperCard stack files and returns them as StackTalk JSON,
so an agent can port stacks without guessing a binary format.

## Requirements

### M1 Tools
1. THE server SHALL expose `inspect_stack(path)`: block types, counts, card names.
2. THE server SHALL expose `get_card(path, index)`: objects and scripts on that card.
3. THE server SHALL expose `extract_scripts(path)`: all scripts with their owner and line numbers.
4. THE server SHALL expose `convert_stack(path)`: StackTalk JSON with a list of things it could not convert.
5. THE server SHALL expose `lookup_command(name)`: reference text for a HyperTalk command.

### M2 Safety
1. THE server SHALL only read files under allowed folders set in config.
2. THE server SHALL never write or execute anything from a stack file.
3. IF a file is corrupt or too large (default 50 MB), THEN THE server SHALL return a clear error and not crash.

### M3 Format
1. THE reader SHALL parse the block layout (STAK, CARD, BKGD, BMAP, and others) by block size and type.
2. THE reader SHALL skip unknown blocks and list them in the report.

## Property-test targets
- Random byte input never crashes the reader.
- Valid generated stacks round trip: build block bytes, read them, get the same objects.

## Design notes
- TypeScript, official MCP SDK, stdio transport.
- Register in `.kiro/settings/mcp.json` as `stackfile`.
- Test with a few public-domain stacks and generated ones.

## Tasks
- [ ] 1. Block reader with bounds checks (M3, M2.3)
- [ ] 2. `inspect_stack`, `get_card`, `extract_scripts`
- [ ] 3. `convert_stack`, `lookup_command`
- [ ] 4. Folder allowlist and size limit (M2)
- [ ]* 5. Property tests
