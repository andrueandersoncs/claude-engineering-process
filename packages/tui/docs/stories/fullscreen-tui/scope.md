# Scope: Fullscreen TUI

## In Scope

### Core Features (Must Have)

1. **Alternate Screen Buffer**
   - Enter alternate screen buffer on app start
   - Exit alternate screen buffer on app quit
   - Clear screen on enter for clean display

2. **Cursor Management**
   - Hide cursor during fullscreen mode
   - Restore cursor visibility on exit

3. **Signal Handling**
   - Clean exit on SIGINT (Ctrl+C)
   - Clean exit on SIGTERM
   - Clean exit on uncaught exceptions
   - Clean exit on unhandled rejections

4. **Mode Detection**
   - Disable fullscreen when `--headless` flag is used
   - Disable fullscreen when stdout is not a TTY
   - Disable fullscreen in testing environments

### Files to Modify

- `src/index.tsx` - Add fullscreen enter/exit logic

### Files to Create

- None (keeping it minimal)

### Tests to Add

- Unit test for fullscreen utility functions
- Integration test for signal handling

## Out of Scope (Future Iterations)

1. **Mouse support** - Not needed for MVP
2. **Focus stealing prevention** - Complex, defer
3. **Custom terminal detection** - Use simple isTTY check
4. **Configurable fullscreen toggle** - Always fullscreen when TTY
5. **Windows cmd.exe support** - Only Windows Terminal (modern)
6. **Alternate key bindings for fullscreen toggle** - Keep automatic

## Boundaries

### What We Will Change

| Component | Change Type | Impact |
|-----------|-------------|--------|
| `src/index.tsx` | Add fullscreen functions | Low - localized |
| `src/index.tsx` | Add process handlers | Low - localized |
| `src/index.tsx` | Modify cleanup function | Low - existing pattern |

### What We Will NOT Change

| Component | Reason |
|-----------|--------|
| Dashboard.tsx | Already handles terminal dimensions |
| App.tsx | No changes needed |
| useKeyboard.ts | No changes needed |
| All other components | No changes needed |

## Minimal Implementation

The absolute minimum is:

1. Add ANSI escape sequence constants (4 constants)
2. Add `enterFullscreen()` function (3 lines)
3. Add `exitFullscreen()` function (2 lines)
4. Call `enterFullscreen()` before render (1 line + condition)
5. Call `exitFullscreen()` in cleanup (1 line)
6. Add `uncaughtException` handler (4 lines)
7. Add `unhandledRejection` handler (4 lines)

Total: ~25 lines of new code in one file.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests break due to fullscreen | Low | High | Headless detection prevents |
| Terminal stuck in alt screen | Low | Medium | Multiple exit handlers |
| Crash leaves terminal broken | Medium | Medium | uncaughtException handler |
| Doesn't work on some terminals | Low | Low | isTTY detection |

## Success Criteria

1. `ep-tui` starts in fullscreen mode (alt buffer)
2. Previous terminal content restored on quit
3. All existing tests pass unchanged
4. Works on macOS Terminal, iTerm2
5. Works on Linux common terminals (gnome-terminal, xterm)
6. No visual flicker on start/exit
