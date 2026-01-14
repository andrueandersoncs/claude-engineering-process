# Design: Fullscreen TUI

## Overview

Add fullscreen mode to the TUI using the terminal's alternate screen buffer. When the TUI starts, it will switch to the alternate buffer (like vim/htop), and when it exits, the original terminal content will be restored.

## Requirements

### Functional
- Enter alternate screen buffer on app start (when running interactively)
- Exit alternate screen buffer on app quit (any exit path)
- Hide cursor during operation
- Skip fullscreen mode in headless mode and non-TTY environments

### Non-Functional
- No new dependencies
- Minimal code changes (~25 lines)
- Cross-platform (macOS, Linux, Windows Terminal)
- Crash-safe (terminal restored even on uncaught exceptions)

## Architecture

### ANSI Escape Sequences

```typescript
// Alternate screen buffer control (xterm-style, widely supported)
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';

// Cursor visibility
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

// Screen clearing
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
```

### Function Design

```typescript
/**
 * Check if fullscreen mode should be enabled.
 * Returns false for headless mode, non-TTY, or test environments.
 */
function shouldEnableFullscreen(headless: boolean): boolean {
  if (headless) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

/**
 * Enter fullscreen mode (alternate screen buffer).
 * Switches to alternate buffer, hides cursor, and clears screen.
 */
function enterFullscreen(): void {
  process.stdout.write(ENTER_ALT_SCREEN);
  process.stdout.write(HIDE_CURSOR);
  process.stdout.write(CLEAR_SCREEN);
}

/**
 * Exit fullscreen mode (restore main screen buffer).
 * Shows cursor and switches back to main buffer.
 */
function exitFullscreen(): void {
  process.stdout.write(SHOW_CURSOR);
  process.stdout.write(EXIT_ALT_SCREEN);
}
```

### Integration Points

```
renderApp(options)
├── Check shouldEnableFullscreen(headless)
├── If true: enterFullscreen()
├── render(<App ... />)
├── cleanup() ← Enhanced with exitFullscreen()
└── Process handlers (SIGINT, SIGTERM, uncaughtException)
```

## Data Flow

```
1. CLI invoked
   └── parseArgs() → options = { projectDir, initialStory, headless }
        └── renderApp(options)

2. renderApp()
   ├── isFullscreen = shouldEnableFullscreen(headless)
   │
   ├── if (isFullscreen)
   │   └── enterFullscreen()
   │
   ├── cleanup = () => {
   │   ├── killAllRunners()
   │   ├── inkInstance?.unmount()
   │   └── if (isFullscreen) exitFullscreen()  ← NEW
   │   }
   │
   ├── Register handlers:
   │   ├── SIGINT → cleanup() + exit(0)
   │   ├── SIGTERM → cleanup() + exit(0)
   │   ├── uncaughtException → exitFullscreen() + exit(1)  ← NEW
   │   └── unhandledRejection → exitFullscreen() + exit(1)  ← NEW
   │
   └── render(<App />)
```

## Interface Changes

### renderApp Function (Enhanced)

No interface changes - same signature. Internal behavior changes:

```typescript
// Before
export async function renderApp(options: CLIOptions): Promise<void> {
  // render directly
}

// After
export async function renderApp(options: CLIOptions): Promise<void> {
  const isFullscreen = shouldEnableFullscreen(options.headless);
  if (isFullscreen) enterFullscreen();
  // render
  // cleanup enhanced to call exitFullscreen()
}
```

## Key Decisions

### Decision 1: Where to Add Fullscreen Logic

**Context**: Could be in index.tsx, App.tsx, or a new component

**Options**:
1. `index.tsx` (renderApp function) - Before React renders
2. `App.tsx` (useEffect hook) - React lifecycle
3. `FullScreen.tsx` component wrapper

**Selected**: Option 1 - `index.tsx`

**Rationale**:
- Fullscreen is not a React concern, it's a terminal mode
- Ensures exit happens even if React crashes
- Matches existing SIGINT/SIGTERM pattern
- Single point of control

### Decision 2: Error Handler Strategy

**Context**: Need to restore terminal on crashes

**Options**:
1. Only SIGINT/SIGTERM handlers
2. Add uncaughtException handler
3. Add both uncaughtException and unhandledRejection

**Selected**: Option 3 - Both handlers

**Rationale**:
- Maximizes crash safety
- Prevents "stuck terminal" scenario
- Small code footprint

### Decision 3: Cursor Hiding

**Context**: Should we hide the cursor during operation?

**Options**:
1. Yes - Hide cursor (cleaner look)
2. No - Keep cursor visible
3. Optional flag

**Selected**: Option 1 - Hide cursor

**Rationale**:
- Standard for fullscreen TUI apps (htop, vim)
- Prevents distracting blinking cursor
- Easy to implement (2 extra lines)

## Design Simulation

### Scenario 1: Normal Interactive Usage

```
1. User runs: ep-tui
2. shouldEnableFullscreen(false) → true (not headless, is TTY)
3. enterFullscreen() called
   - Screen switches to alternate buffer
   - Cursor hidden
   - Screen cleared
4. Ink app renders
5. User presses 'q' to quit
6. cleanup() called
   - killAllRunners()
   - inkInstance.unmount()
   - exitFullscreen() ← cursor shown, main buffer restored
7. Terminal shows previous content
```

**Result**: Clean enter and exit

### Scenario 2: Ctrl+C Interrupt

```
1. User runs: ep-tui
2. enterFullscreen() called
3. User presses Ctrl+C
4. SIGINT received
5. cleanup() called
   - killAllRunners()
   - inkInstance.unmount()
   - exitFullscreen()
6. process.exit(0)
7. Terminal restored
```

**Result**: Clean exit on interrupt

### Scenario 3: Crash/Uncaught Exception

```
1. User runs: ep-tui
2. enterFullscreen() called
3. Some code throws uncaught Error
4. uncaughtException handler fires
5. exitFullscreen() called directly
6. Error logged to stderr
7. process.exit(1)
8. Terminal restored
```

**Result**: Terminal restored even on crash

### Scenario 4: Headless Mode

```
1. User runs: ep-tui --headless --story test
2. shouldEnableFullscreen(true) → false
3. enterFullscreen() NOT called
4. Ink app renders once
5. Exits normally
```

**Result**: No fullscreen in headless mode, tests work

### Scenario 5: Piped Output (Non-TTY)

```
1. User runs: ep-tui | cat
2. shouldEnableFullscreen(false) → checks isTTY
3. process.stdout.isTTY === false
4. enterFullscreen() NOT called
5. Output goes to pipe normally
```

**Result**: No fullscreen when not TTY

**Simulation Result**: All scenarios handled correctly.

## Test Architecture

### Unit Tests

| Test Case | File | Description |
|-----------|------|-------------|
| shouldEnableFullscreen returns false for headless | tests/unit/fullscreen.test.ts | |
| shouldEnableFullscreen returns false for non-TTY | tests/unit/fullscreen.test.ts | Mock isTTY |
| shouldEnableFullscreen returns true for interactive | tests/unit/fullscreen.test.ts | |

### Integration Tests

| Test Case | File | Description |
|-----------|------|-------------|
| Existing tests pass unchanged | All test files | No modifications |
| Signal handlers registered | tests/e2e/fullscreen.test.ts | Verify handlers exist |

### Test Data Setup

- No fixtures needed
- Mock `process.stdout.isTTY` for non-TTY tests
- Use existing headless mode for most tests

## Implementation Notes

1. Add constants at top of `index.tsx` (after imports)
2. Add helper functions before `renderApp()`
3. Track fullscreen state with local variable in `renderApp()`
4. Add error handlers early in `renderApp()` (before render)
5. Enhance existing cleanup function (don't replace)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Terminal stuck in alt buffer | Low | High | Multiple exit handlers |
| ANSI codes visible in non-supporting terminals | Very Low | Low | isTTY check |
| Cursor stays hidden | Low | Medium | Show cursor in all exit paths |
| Tests interfere with fullscreen | Low | High | Headless check in shouldEnableFullscreen |
