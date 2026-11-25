# Design: Web UI

- Plain TypeScript with Vite. Small view layer (no heavy framework). Render with DOM functions.
- `src/web/stack.ts`: Stack types, `validate`, `serialize`.
- `src/web/host.ts`: `WebHost implements Host`, backed by the loaded stack.
- `src/web/render.ts`: draw current card; `edit.ts`: drag, resize, script panel.
- `src/web/theme.css`: CSS variables for the haunted theme and high-contrast mode.
- State: one store object. UI events call `store.dispatch(action)`; render reads state.

## Stack JSON (sketch)
```json
{ "name": "Hello", "cards": [{ "id": "c1", "buttons": [{ "id": "b1", "name": "Boo",
  "rect": [10,10,80,30], "script": "on mouseUp\n answer \"Boo!\"\nend mouseUp" }], "fields": [] }] }
```

## Testing
- Unit tests for `validate` and `WebHost`.
- Property tests for save/load round trip and bounds.
