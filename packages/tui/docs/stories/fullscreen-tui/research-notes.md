# Research Notes: Fullscreen TUI

## Codebase Analysis

### Entry Point: `src/index.tsx`

The current rendering flow is:

```typescript
// src/index.tsx:80-86
inkInstance = render(
  <App projectDir={projectDir} initialStory={initialStory} headless={headless} />
);
```

Key observations:
- `inkInstance` is already tracked for cleanup on SIGINT/SIGTERM
- Cleanup calls `killAllRunners()` before `inkInstance.unmount()`
- The headless mode already bypasses waiting for exit

**Integration Point**: The fullscreen mode should be activated in `renderApp()` before calling `render()` and deactivated on cleanup.

### Cleanup Handler: `src/index.tsx:49-58`

```typescript
const cleanup = (): void => {
  killAllRunners();
  if (inkInstance) {
    inkInstance.unmount();
    inkInstance = null;
  }
};
```

**Integration Point**: Must add `exitAltScreen()` call here to restore terminal on exit.

### Component Structure

```
index.tsx (renderApp)
└── App.tsx
    ├── StoryPicker.tsx (view === 'picker')
    ├── Dashboard.tsx (view === 'dashboard')
    │   ├── Header.tsx
    │   ├── TaskListPanel.tsx (30%)
    │   ├── OutputPanel.tsx (70%)
    │   └── StatusBar.tsx
    └── HelpModal.tsx (view === 'help')
```

The Dashboard already uses `useStdout()` to get terminal dimensions:

```typescript
// src/components/Dashboard.tsx:81-87
const { stdout } = useStdout();
const terminalWidth = stdout?.columns ?? MIN_WIDTH;
const terminalHeight = stdout?.rows ?? MIN_HEIGHT;
```

**Observation**: Terminal resize is already handled. No changes needed for dimension tracking.

### Testing Infrastructure

Tests use `ink-testing-library`:
- `render()` from ink-testing-library for component tests
- `headless={true}` mode for E2E tests
- Tests don't actually interact with the real terminal

**Critical**: Fullscreen mode must NOT activate during tests. The headless flag should control this.

## Approach Options

### Option A: Wrapper Function in index.tsx (Recommended)

Add functions to manage alternate screen buffer at the application level:

```typescript
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';

function enterFullscreen(): void {
  process.stdout.write(ENTER_ALT_SCREEN);
  process.stdout.write(HIDE_CURSOR);
  process.stdout.write(CLEAR_SCREEN);
}

function exitFullscreen(): void {
  process.stdout.write(SHOW_CURSOR);
  process.stdout.write(EXIT_ALT_SCREEN);
}
```

**Pros**:
- Simple, no new dependencies
- Centralized control at entry point
- Easy to test (just check calls to enterFullscreen/exitFullscreen)
- Clean separation from React components

**Cons**:
- Side effects outside React lifecycle
- Need to handle edge cases in cleanup

### Option B: React Component Wrapper

Create a `<FullScreen>` component that manages the buffer in useEffect:

```typescript
function FullScreen({ children, enabled }) {
  useEffect(() => {
    if (!enabled) return;
    enterFullscreen();
    return () => exitFullscreen();
  }, [enabled]);
  return children;
}
```

**Pros**:
- React lifecycle manages cleanup
- More "React-like" pattern

**Cons**:
- Adds component complexity
- Harder to ensure cleanup happens on crashes
- Still need process handlers for SIGINT/SIGTERM

### Option C: Use fullscreen-ink Package

Install `fullscreen-ink` npm package.

**Pros**:
- Battle-tested solution
- Possibly handles edge cases

**Cons**:
- Additional dependency
- Less control over behavior
- Package has low weekly downloads (32 dependents)
- May not be maintained

## Selected Approach: Option A (Wrapper Functions)

Rationale:
1. Simplest implementation with no new dependencies
2. Centralized at `renderApp()` - single point of control
3. Matches existing cleanup pattern (SIGINT/SIGTERM handlers)
4. Easy to disable for headless/testing mode

## Implementation Plan

### File Changes

1. **`src/index.tsx`** - Main changes
   - Add ANSI escape sequence constants
   - Add `enterFullscreen()` and `exitFullscreen()` functions
   - Call `enterFullscreen()` before `render()` (when not headless)
   - Add `exitFullscreen()` to cleanup function
   - Add unhandled exception handler for crash safety

2. **`src/utils/constants.ts`** - Optional
   - Could move ANSI sequences here if reused elsewhere
   - Keep in index.tsx for now (simpler)

3. **Tests** - Verify no interference
   - All existing tests should pass (use headless mode)
   - Add unit test for fullscreen functions
   - Add integration test verifying cleanup on signals

## Error Handling Considerations

### Crash Safety

If the app crashes without calling `exitFullscreen()`, the user's terminal will be stuck in alternate screen mode. Solutions:

1. **Wrap in try/finally**: Ensure cleanup on any error
2. **uncaughtException handler**: Add process handler
3. **unhandledRejection handler**: Add process handler

```typescript
process.on('uncaughtException', (err) => {
  exitFullscreen();
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  exitFullscreen();
  console.error(err);
  process.exit(1);
});
```

### Edge Cases

1. **TTY detection**: Only use fullscreen on TTY (`process.stdout.isTTY`)
2. **CI environments**: Disable fullscreen in CI (no TTY)
3. **Piped output**: Disable when stdout is piped
4. **Windows**: ANSI sequences work in Windows Terminal but not old cmd.exe

## References

- [GitHub Issue #263 - Ink fullscreen](https://github.com/vadimdemedes/ink/issues/263)
- [ANSI escape sequences](https://en.wikipedia.org/wiki/ANSI_escape_code)
- Terminal capabilities: `\x1b[?1049h/l` - alternate screen (xterm-style)
