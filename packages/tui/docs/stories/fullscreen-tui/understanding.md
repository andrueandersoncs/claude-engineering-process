# Understanding: Fullscreen TUI

## Story Summary

Transform the engineering-process TUI from a standard terminal output mode into a true fullscreen application that uses the terminal's alternate screen buffer, similar to applications like `htop`, `vim`, or `less`.

## Current Behavior

The TUI currently:
1. Renders using Ink directly to the main terminal buffer
2. Output persists after the application exits
3. Does not claim the full terminal window
4. Content accumulates and scrolls in the main terminal
5. Previous terminal history is visible above the TUI

## Desired Behavior

The TUI should:
1. Enter the terminal's alternate screen buffer on startup
2. Clear and take over the entire terminal screen
3. Restore the original terminal content when exiting
4. Handle terminal resize events gracefully
5. Preserve the ability to run in headless mode for testing

## Key Requirements

### Functional Requirements

1. **Alternate Screen Buffer**: Use ANSI escape sequences to switch to alternate screen
   - Enter: `\x1b[?1049h`
   - Exit: `\x1b[?1049l`

2. **Clean Exit**: Always restore the main screen buffer on:
   - Normal quit (q key)
   - SIGINT (Ctrl+C)
   - SIGTERM
   - Errors/crashes

3. **Terminal Resize Handling**: Already implemented via `useStdout()` in Dashboard

4. **Headless Mode Compatibility**: Must not enter fullscreen mode when `--headless` is passed

### Non-Functional Requirements

1. **Cross-Platform**: Works on macOS, Linux terminals, and Windows Terminal
2. **Performance**: No impact on rendering performance
3. **Testability**: Testing library must work without fullscreen mode interfering

## Gaps & Clarifications Needed

1. **Cursor Visibility**: Should we hide the cursor during fullscreen mode?
2. **Mouse Support**: Is mouse support desired for future iteration?
3. **Focus Handling**: Should we capture focus and prevent background processes from interrupting?

## Acceptance Criteria

1. Running `ep-tui` enters fullscreen mode (alternate screen buffer)
2. Quitting `ep-tui` restores original terminal content
3. Ctrl+C cleanly exits and restores terminal
4. `--headless` mode does not enter fullscreen
5. Terminal resize is handled correctly
6. All existing tests continue to pass

## Technical Approach Preview

Based on research, the recommended approach is:

```typescript
// Enter fullscreen (alternate screen buffer)
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';

// Optional: Hide/show cursor
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
```

This will be wrapped in either:
- A React component (`<FullScreen>` wrapper)
- Or integrated into `renderApp` function lifecycle

Sources:
- [Ink Fullscreen Discussion](https://github.com/vadimdemedes/ink/issues/263)
- [fullscreen-ink npm package](https://www.npmjs.com/package/fullscreen-ink)
