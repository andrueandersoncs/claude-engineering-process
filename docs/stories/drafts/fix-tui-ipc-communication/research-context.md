# Research Context: Fix TUI IPC Communication

## Date
2026-01-14

## Current TUI Architecture

### Overview
The TUI package (`packages/tui/`) is a Terminal User Interface built with Ink v5 and React 18 that orchestrates the engineering-process workflow. It spawns Claude CLI subprocesses to execute tasks autonomously following the "Ralph Wiggum" pattern (fresh context per task).

### Communication Stack

**Current IPC Method: stdin/stdout Piping via Shell Command**

Location: `packages/tui/src/services/claudeRunner.ts` (lines 84-166)

```typescript
// Current implementation (lines 104-120)
// Write prompt to a temp file to avoid stdin issues with execa
this.tempFile = join(tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
writeFileSync(this.tempFile, prompt);

// Use shell mode to pipe the temp file to Claude
const command = `cat "${this.tempFile}" | ${this.claudeBin} --print`;

this.process = execaCommand(command, {
  shell: true,
  env,
  cwd: options.cwd,
  reject: false,
  buffer: true,
});
```

**Key Insight from Code Comment (line 85):**
> "Uses a temp file approach for stdin because execa's direct stdin input doesn't work reliably with Claude CLI for long prompts."

### Architecture Components

1. **ClaudeRunnerImpl** (`src/services/claudeRunner.ts`)
   - Spawns Claude CLI subprocesses
   - Uses `cat file | claude --print` pattern
   - Streams stdout/stderr to callbacks
   - Manages process lifecycle

2. **WorkflowOrchestratorImpl** (`src/services/workflowOrchestrator.ts`)
   - Coordinates task execution
   - Builds prompts with embedded context
   - Handles validation between tasks
   - Manages task status updates

3. **promptBuilder** (`src/services/promptBuilder.ts`)
   - Loads context files (tasks.md, design.md, research-notes.md)
   - Embeds context into prompt strings
   - Can generate large prompts (multi-KB)

### Identified Problems with Current Approach

#### 1. **Temp File + Shell Piping is Fragile**

**Evidence:**
- Comment at line 85 states direct stdin "doesn't work reliably"
- Requires shell interpretation (`cat | claude`)
- Creates race conditions (write → read timing)
- Temp files may not clean up on crashes
- Shell special characters can break pipes

**User Report:**
> "I think the method of piping input and output is flawed and destined for failure"

#### 2. **Buffering and Streaming Issues**

**Observed Patterns:**
- Uses `buffer: true` in execa options (line 119)
- Streams data via `stream.on('data')` handlers (lines 186-189)
- Output chunks arrive asynchronously
- No backpressure mechanism for fast producers

**Potential Issues:**
- Large outputs may overflow buffers
- Chunks may arrive out of order
- Stream errors not always handled gracefully

#### 3. **Process Lifecycle Complexity**

**Current Behavior:**
- Spawns via `execaCommand()` with shell
- Tracks process via PID
- Kills with SIGTERM
- Cleans up temp files manually
- Multiple failure points (spawn, pipe, cleanup)

#### 4. **No Bidirectional Communication**

**Current Limitation:**
- Only supports one-shot prompts
- Cannot send follow-up messages
- Cannot implement streaming interrupts
- Cannot request clarification during execution

### Alternative IPC Mechanisms Research

#### Option A: Unix Domain Sockets

**Advantages:**
- Bidirectional communication
- Low latency (no network stack)
- Built-in Node.js support (`net.createServer()`)
- No shell interpretation needed
- Reliable delivery guarantees

**Performance:**
- Equivalent to anonymous pipes for single streams
- Better than pipes for concurrent streams (source: 60devs.com)

**Implementation Path:**
- TUI creates Unix socket at `/tmp/ep-tui-${pid}.sock`
- Claude CLI connects as client (requires CLI modification)
- Exchange messages via line-delimited JSON

**Challenges:**
- Requires Claude CLI support (may not exist)
- More complex protocol design
- Cross-platform considerations (Windows named pipes)

#### Option B: HTTP/WebSocket Server

**Advantages:**
- Language-agnostic
- Well-established protocols
- Easy debugging (curl, browser tools)
- Supports streaming and chunking
- Built-in error handling

**Implementation Path:**
- TUI runs HTTP server on localhost random port
- Pass port via environment variable to Claude CLI
- Claude CLI POSTs results back
- Optional WebSocket for streaming

**Challenges:**
- Higher overhead than sockets
- Requires Claude CLI HTTP client support
- Port management complexity

#### Option C: node-ipc Package

**Advantages:**
- Cross-platform (Unix sockets + Windows named pipes)
- Pub/sub pattern built-in
- Well-tested library
- Handles serialization automatically

**Implementation Path:**
```javascript
const ipc = require('node-ipc');

// TUI (server)
ipc.serve(() => {
  ipc.server.on('task-result', (data) => { /* handle */ });
});

// Claude wrapper (client)
ipc.connectTo('ep-tui', () => {
  ipc.of.ep_tui.emit('task-result', { status: 'complete' });
});
```

**Challenges:**
- Adds dependency
- Requires wrapper around Claude CLI
- Learning curve for protocol

#### Option D: Native IPC via child_process

**Advantages:**
- Built into Node.js (no dependencies)
- Uses `process.send()` / `process.on('message')`
- Structured message passing
- No files, pipes, or sockets needed

**Implementation Path:**
```javascript
// TUI spawns with IPC channel
const proc = spawn('node', ['claude-wrapper.js'], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc']
});

proc.on('message', (msg) => {
  // Receive structured messages
});

proc.send({ type: 'prompt', data: promptText });
```

**Requirements:**
- Requires Node.js wrapper around Claude CLI
- Wrapper manages actual Claude CLI subprocess
- Serializes messages between TUI and Claude

**Challenges:**
- Cannot use Claude CLI directly (needs wrapper)
- Extra process layer
- More complex architecture

#### Option E: Improved File-Based IPC

**Advantages:**
- No Claude CLI modifications needed
- Cross-platform compatible
- Simple to implement
- Easy to debug (inspect files)

**Implementation Path:**
- TUI writes prompt to `/tmp/ep-tui-${taskId}-input.txt`
- TUI spawns Claude: `claude -f /tmp/ep-tui-${taskId}-input.txt > /tmp/ep-tui-${taskId}-output.txt`
- TUI tails output file for streaming
- Both processes watch for completion signal file

**Challenges:**
- Still file-based (user considers this flawed)
- Requires file watching (chokidar)
- Race conditions for completion detection

### Claude CLI Capabilities

**Research Findings:**

From Claude Code documentation and GitHub issues:
- Primary interface: stdin/stdout piping
- Supports `-p` flag for prompt (non-interactive mode)
- Supports `--print` flag for print-only mode
- Has headless mode for CI/automation
- JSON output format: `--output-format stream-json`

**No Evidence Found For:**
- Unix socket support
- HTTP/WebSocket server mode
- Native IPC channel support
- Plugin API for external tools

**Conclusion:** Claude CLI appears designed exclusively for stdin/stdout usage.

### loop.sh Pattern Comparison

The `scripts/loop.sh` script (reviewed) uses the SAME pattern:

```bash
# Line 429 in loop.sh
if $CLAUDE_BIN -p "$prompt"; then
```

This passes prompts directly via `-p` flag (not stdin piping). This is MORE reliable than the TUI's current approach.

**Key Difference:**
- loop.sh: Uses `-p` flag to pass prompt as argument
- TUI: Uses `cat file | claude --print` with stdin piping

**Recommendation:** TUI should adopt loop.sh pattern.

## Existing Test Patterns

### Test Framework: Vitest + ink-testing-library

**E2E Tests** (`packages/tui/tests/e2e/`):
- `workflow.test.ts`: Spawns TUI binary in headless mode
- Uses `execa` to run `node bin/ep-tui.js --headless`
- Validates stdout contains expected output
- Tests story loading, phase progress, task display

**Unit Tests** (`packages/tui/tests/unit/`):
- `createStory.test.ts`: Tests story creation logic
- `promptBuilder.test.ts`: Tests prompt construction
- `taskParser.test.ts`: Tests task parsing from markdown
- Uses fixtures in `tests/fixtures/`

**Test Strategy:**
- TDD mandated by CLAUDE.md
- Tests written BEFORE implementation
- Must fail first to verify they test correctly
- Red → Green → Refactor per task

### Coverage

Current coverage areas:
- Component rendering (Ink components)
- Store actions (Zustand)
- Service functions (parsing, building)
- E2E workflow execution

Gap: No tests for IPC failure modes or recovery.

## Domain Terminology

**From Codebase:**
- **Story**: A feature or bug fix being worked on
- **Task**: An individual unit of work within a story
- **Phase**: One of 8 stages (Understand, Research, Scope, Design, Decompose, Implement, Validate, Deploy)
- **Runner**: Service that spawns and manages Claude CLI processes
- **Orchestrator**: Service that coordinates task execution
- **Fresh Context**: Pattern of spawning new Claude process per task to avoid context pollution

## User Roles Identified

Based on CLAUDE.md and usage patterns:

1. **Developer/Engineer** (Primary)
   - Uses TUI to execute engineering workflow
   - Monitors progress visually
   - Interacts via keyboard commands

2. **CI/Automation System** (Secondary)
   - Uses headless mode
   - Expects reliable exit codes
   - No human interaction

3. **Plugin Developer** (Tertiary)
   - Extends engineering-process plugin
   - May integrate TUI into other tools

## Related Issues/Stories

Found existing story demonstrating TUI bugs:
- `docs/stories/drafts/tui-create-story-no-output/`
- Similar symptom: UI not updating after action
- Root cause: State/rendering synchronization

This suggests TUI has broader reliability issues beyond just IPC.

## Dependencies

**Critical Dependencies:**
- `execa` v8.0.1 - Current subprocess library
- `ink` v5.0.1 - Terminal UI framework
- `chokidar` v3.6.0 - File watching
- `zustand` v4.5.0 - State management

**Potential New Dependencies:**
- `node-ipc` - If choosing Unix socket approach
- `express` / `ws` - If choosing HTTP/WebSocket approach
- None - If improving current approach or using `-p` flag

## Performance Considerations

**Current Bottlenecks:**
1. Temp file I/O on every task
2. Shell spawn overhead
3. Stream buffering and parsing
4. File cleanup on crash recovery

**IPC Performance Hierarchy** (from research):
1. Native pipes / Unix sockets: ~equivalent, fastest
2. TCP sockets: 20-40% slower
3. Redis pub/sub: Similar to TCP
4. File-based: Slowest (disk I/O)

**TUI Use Case:**
- Typically 1-50 tasks per story
- Each task: 10s - 5min execution time
- IPC overhead << task execution time
- **Conclusion:** Reliability >> Performance

## Security Considerations

**Current Approach:**
- Temp files in `/tmp` with random names
- Readable by any user on system (security issue)
- Cleanup on exit (but not on crash)

**Alternative Approaches:**
- Unix sockets: File permissions apply
- HTTP localhost: Network exposure (minimal)
- IPC channels: Process-isolated

**Recommendation:** Any solution should use restrictive permissions.

## Cross-Platform Concerns

**Current Support:** macOS, Linux, Windows (via WSL)

**IPC Compatibility:**
- Unix sockets: macOS ✓, Linux ✓, Windows (via named pipes)
- HTTP: All platforms ✓
- Native IPC: All platforms ✓
- Temp files: All platforms ✓

**Claude CLI Availability:**
- Confirmed: macOS, Linux
- Windows: Via WSL (unknown direct support)

## Conclusion

The core issue is using an unreliable IPC mechanism (temp file + shell pipe) when a more reliable approach exists (Claude CLI `-p` flag, as used by loop.sh). The fix should:

1. **Eliminate temp files and shell piping**
2. **Use `-p` flag directly** (proven pattern from loop.sh)
3. **Improve error handling** around subprocess failures
4. **Add tests for failure modes**

This is a **refinement** of the existing approach, not a complete rewrite to sockets/HTTP. The user's concern about piping being "flawed" is valid—but the solution is to use Claude CLI's intended interface (`-p` flag), not to invent a new protocol.
