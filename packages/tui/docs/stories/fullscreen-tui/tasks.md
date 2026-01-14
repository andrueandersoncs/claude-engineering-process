# Tasks: Fullscreen TUI

## Task 1: Add ANSI Escape Sequence Constants

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: XS

Add the ANSI escape sequence constants at the top of index.tsx after imports:

```typescript
// Fullscreen mode ANSI escape sequences
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
```

**Acceptance Criteria**:
- [ ] Constants defined at module level
- [ ] TypeScript compiles without errors

---

## Task 2: Add shouldEnableFullscreen Function

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: XS

Add the function to determine if fullscreen mode should be enabled:

```typescript
/**
 * Check if fullscreen mode should be enabled.
 * Returns false for headless mode or non-TTY environments.
 */
function shouldEnableFullscreen(headless: boolean): boolean {
  if (headless) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}
```

**Acceptance Criteria**:
- [ ] Function returns false when headless=true
- [ ] Function returns false when stdout is not a TTY
- [ ] Function returns true for interactive terminals

---

## Task 3: Add enterFullscreen and exitFullscreen Functions

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: XS

Add the functions to enter and exit fullscreen mode:

```typescript
/**
 * Enter fullscreen mode (alternate screen buffer).
 */
function enterFullscreen(): void {
  process.stdout.write(ENTER_ALT_SCREEN);
  process.stdout.write(HIDE_CURSOR);
  process.stdout.write(CLEAR_SCREEN);
}

/**
 * Exit fullscreen mode (restore main screen buffer).
 */
function exitFullscreen(): void {
  process.stdout.write(SHOW_CURSOR);
  process.stdout.write(EXIT_ALT_SCREEN);
}
```

**Acceptance Criteria**:
- [ ] enterFullscreen writes 3 escape sequences
- [ ] exitFullscreen writes 2 escape sequences
- [ ] Functions can be called without errors

---

## Task 4: Integrate Fullscreen Mode into renderApp

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: S

Modify the renderApp function to:
1. Check if fullscreen should be enabled
2. Enter fullscreen before rendering
3. Track fullscreen state for cleanup

```typescript
export async function renderApp(options: CLIOptions): Promise<void> {
  const { projectDir, initialStory, headless } = options;

  // Determine if we should use fullscreen mode
  const isFullscreen = shouldEnableFullscreen(headless);

  // Enter fullscreen mode if enabled
  if (isFullscreen) {
    enterFullscreen();
  }

  // ... rest of function
}
```

**Acceptance Criteria**:
- [ ] Fullscreen mode enabled for interactive usage
- [ ] Fullscreen mode disabled for headless usage
- [ ] No visual flicker on start

---

## Task 5: Update cleanup Function to Exit Fullscreen

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: XS

Enhance the existing cleanup function to call exitFullscreen:

```typescript
// Need to track isFullscreen in closure
const cleanup = (): void => {
  killAllRunners();
  if (inkInstance) {
    inkInstance.unmount();
    inkInstance = null;
  }
  if (isFullscreen) {
    exitFullscreen();
  }
};
```

**Acceptance Criteria**:
- [ ] exitFullscreen called on quit (q key)
- [ ] exitFullscreen called on SIGINT
- [ ] exitFullscreen called on SIGTERM
- [ ] Terminal restored to original state

---

## Task 6: Add Error Handlers for Crash Safety

**Status**: pending
**File**: `src/index.tsx`
**Estimated Size**: S

Add process handlers for uncaught exceptions and rejections to ensure terminal is restored on crashes:

```typescript
// Add these before the render call
process.on('uncaughtException', (err) => {
  if (isFullscreen) {
    exitFullscreen();
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (isFullscreen) {
    exitFullscreen();
  }
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
```

**Acceptance Criteria**:
- [ ] uncaughtException handler registered
- [ ] unhandledRejection handler registered
- [ ] Terminal restored on crash
- [ ] Error message visible after exit

---

## Task 7: Write Unit Tests for Fullscreen Functions

**Status**: pending
**File**: `tests/unit/fullscreen.test.ts` (new file)
**Estimated Size**: S

Create unit tests for the fullscreen utility functions:

```typescript
describe('shouldEnableFullscreen', () => {
  it('returns false when headless is true', () => {
    expect(shouldEnableFullscreen(true)).toBe(false);
  });

  it('returns false when stdout is not TTY', () => {
    // Mock process.stdout.isTTY
  });

  it('returns true for interactive terminals', () => {
    // Mock process.stdout.isTTY = true
  });
});
```

**Acceptance Criteria**:
- [ ] Tests for shouldEnableFullscreen
- [ ] Tests pass
- [ ] Coverage for all branches

---

## Task 8: Verify Existing Tests Still Pass

**Status**: pending
**File**: All test files
**Estimated Size**: XS

Run the full test suite to ensure no regressions:

```bash
npm test
```

**Acceptance Criteria**:
- [ ] All existing tests pass
- [ ] No new warnings
- [ ] Coverage not decreased

---

## Task 9: Manual Testing on Interactive Terminal

**Status**: pending
**Estimated Size**: XS

Manual testing checklist:

1. Run `ep-tui` interactively
2. Verify screen switches to alternate buffer (clean slate)
3. Navigate around, verify cursor hidden
4. Press 'q' to quit
5. Verify terminal restored to original state
6. Test Ctrl+C exit
7. Test running with `--headless` (should not use fullscreen)

**Acceptance Criteria**:
- [ ] Fullscreen mode works on macOS Terminal
- [ ] Fullscreen mode works on iTerm2
- [ ] Clean exit on 'q' key
- [ ] Clean exit on Ctrl+C
- [ ] Headless mode works normally

---

## Summary

| Task | Size | Dependencies |
|------|------|--------------|
| 1. Add constants | XS | None |
| 2. Add shouldEnableFullscreen | XS | Task 1 |
| 3. Add enter/exit functions | XS | Task 1 |
| 4. Integrate into renderApp | S | Tasks 2, 3 |
| 5. Update cleanup | XS | Tasks 3, 4 |
| 6. Add error handlers | S | Tasks 3, 4 |
| 7. Write unit tests | S | Tasks 2, 3 |
| 8. Verify existing tests | XS | Tasks 4, 5, 6 |
| 9. Manual testing | XS | Task 8 |

**Total Estimated Effort**: 9 small tasks, ~1-2 hours of implementation
