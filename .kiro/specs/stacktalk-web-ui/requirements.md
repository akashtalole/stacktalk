# Requirements: Web UI

## Introduction
A browser app that shows a stack as cards with buttons and fields, and runs scripts with the core.

## Requirements

### U1 Stack model
1. A stack SHALL be one JSON file with cards, buttons, fields and scripts.
2. WHEN the user loads a stack file, THE app SHALL validate it and show errors in plain English.
3. THE app SHALL save the stack back to JSON with stable key order.

### U2 Run mode
1. WHEN the user clicks a button, THE app SHALL send `mouseUp` to that button via the core.
2. WHEN a handler calls `go`, THE app SHALL show the target card.
3. WHEN a handler calls `answer`, THE app SHALL show a modal dialog.
4. IF a script errors, THEN THE app SHALL show the message and highlight the line.

### U3 Edit mode
1. THE app SHALL let the user add, move and resize buttons and fields.
2. THE app SHALL show a script editor for the selected object.
3. WHEN the user saves a script, THE app SHALL parse it and show errors inline.

### U4 Look (Costume)
1. THE app SHALL use a dark, haunted theme with a high-contrast option.
2. THE app SHALL be usable with a keyboard and screen reader (labels, focus order).

### U5 Host
1. THE app SHALL implement `Host` from the core and keep no logic in the core that needs the DOM.

## Property-test targets
- Stack JSON save then load gives an equal stack.
- Moving an object never puts it outside the card.
