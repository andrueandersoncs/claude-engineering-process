# Design: Fix TUI IPC Communication

## Overview

This design addresses the TUI hang issue caused by missing Node.js spawn configuration when invoking the Claude CLI. The current implementation uses a fragile temp file + shell piping approach that fails 100% of the time. The solution adopts the proven `loop.sh` pattern: direct spawn with the `-p` flag and proper environment configuration.

**Root Cause (GitHub Issue #771):**
1. Missing `ANTHROPIC_API_KEY: ''` in spawn environment
2. No `--output-format stream-json` for real-time streaming
3. Shell piping (`cat file | claude`) instead of direct `-p` flag

**Solution Summary:**
Replace `execaCommand()` shell invocation with direct `execa()` spawn using the `-p` flag and proper environment configuration.

## Requirements

### Functional

- FR1: Spawn Claude CLI with prompt passed via `-p` flag (no temp files)
- FR2: Stream output in real-time using JSONL format
- FR3: Parse JSONL to extract text content and tool_use events
- FR4: Handle process exit with proper status reporting
- FR5: Support prompts up to 100KB without hitting ARG_MAX limits
- FR6: Maintain backward compatibility with existing story/task workflows

### Non-Functional

- **Performance**: IPC overhead reduced from ~40ms to ~15ms per task spawn
- **Reliability**: 100% success rate (vs current 0% success rate)
- **Latency**: Output streaming with < 500ms latency
- **Compatibility**: macOS (1MB ARG_MAX), Linux (2MB ARG_MAX)

## Design

### Architecture

```
+----------------+     spawn      +---------------+
|  Workflow      | -------------> | ClaudeRunner  |
|  Orchestrator  |                |  (refactored) |
+----------------+                +---------------+
        |                                |
        v                                v
+----------------+             +-----------------+
| PromptBuilder  |             | execa()         |
| (unchanged)    |             | claude -p ...   |
+----------------+             | --output-format |
                               | stream-json     |
                               +-----------------+
                                        |
                                        v
                               +-----------------+
                               | JSONL Parser    |
                               | (new component) |
                               +-----------------+
                                        |
                                        v
                               +-----------------+
                               | Output Callbacks|
                               | (unchanged API) |
                               +-----------------+
```

### Component Changes

#### 1. ClaudeRunnerImpl.spawn() - Major Refactor

**Before (Current - Broken):**
```typescript
// Lines 104-120 in claudeRunner.ts
this.tempFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
writeFileSync(this.tempFile, prompt);
const command = `cat "${this.tempFile}" | ${this.claudeBin} --print`;
this.process = execaCommand(command, {
  shell: true,
  env,
  cwd: options.cwd,
  reject: false,
  buffer: true,  // <-- Contradicts streaming goal
});
```

**After (Fixed):**
```typescript
this.process = execa(this.claudeBin, [
  '-p', prompt,
  '--output-format', 'stream-json',
], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: '',  // Critical: prevents hang (GH #771)
    FORCE_COLOR: '1',
    ...options.env,
  },
  cwd: options.cwd,
  reject: false,
});
```

#### 2. JSONL Stream Parser - New Component

**Location**: `packages/tui/src/services/jsonlParser.ts`

**Purpose**: Parse Claude's streaming JSONL output and extract displayable content.

```typescript
export interface JsonlMessage {
  type: 'text' | 'tool_use' | 'system' | 'result';
  content: string;
  toolName?: string;
  toolInput?: unknown;
}

export class JsonlStreamParser {
  private buffer: string = '';

  /**
   * Process incoming chunk, return parsed messages.
   * Handles partial lines by buffering until newline.
   */
  parse(chunk: string): JsonlMessage[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';  // Keep incomplete line

    const messages: JsonlMessage[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = this.parseLine(line);
        if (msg) messages.push(msg);
      } catch {
        // Skip malformed JSON (may be debug output)
      }
    }
    return messages;
  }

  /**
   * Flush any remaining buffered content.
   */
  flush(): JsonlMessage[] {
    if (!this.buffer.trim()) return [];
    try {
      const msg = this.parseLine(this.buffer);
      this.buffer = '';
      return msg ? [msg] : [];
    } catch {
      this.buffer = '';
      return [];
    }
  }

  private parseLine(line: string): JsonlMessage | null {
    const json = JSON.parse(line);

    // Handle content_block_delta events (streaming text)
    if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') {
        return { type: 'text', content: json.delta.text };
      }
    }

    // Handle tool_use events
    if (json.type === 'content_block_start') {
      if (json.content_block?.type === 'tool_use') {
        return {
          type: 'tool_use',
          content: `Using tool: ${json.content_block.name}`,
          toolName: json.content_block.name,
          toolInput: json.content_block.input,
        };
      }
    }

    // Handle assistant messages with content array
    if (json.message?.content) {
      for (const item of json.message.content) {
        if (item.type === 'text') {
          return { type: 'text', content: item.text };
        }
      }
    }

    // Handle result event (final message)
    if (json.type === 'result') {
      return {
        type: 'result',
        content: json.result ?? '',
      };
    }

    return null;
  }
}
```

#### 3. Stream Handler Integration

**Location**: `ClaudeRunnerImpl.setupStreamHandler()` (modified)

```typescript
private jsonlParser = new JsonlStreamParser();

private setupStreamHandler(stream: Readable): void {
  stream.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    const messages = this.jsonlParser.parse(text);

    for (const msg of messages) {
      switch (msg.type) {
        case 'text':
          this.notifyOutput(msg.content);
          break;
        case 'tool_use':
          this.notifyOutput(`\n[Tool: ${msg.toolName}]\n`);
          break;
        case 'result':
          // Final result handled by exit callback
          break;
      }
    }
  });

  stream.on('end', () => {
    // Flush any remaining buffered content
    const remaining = this.jsonlParser.flush();
    for (const msg of remaining) {
      if (msg.type === 'text') {
        this.notifyOutput(msg.content);
      }
    }
  });
}
```

#### 4. Temp File Logic Removal

**Files to Remove from claudeRunner.ts:**
- Import: `writeFileSync`, `unlinkSync` from 'fs'
- Import: `join` from 'path'
- Import: `tmpdir` from 'os'
- Property: `private tempFile: string | null = null;`
- Method: `cleanupTempFile()` (lines 171-180)
- All calls to `cleanupTempFile()`

### API Design

The public API of `ClaudeRunner` interface remains unchanged:

```typescript
export interface ClaudeRunner {
  spawn(prompt: string, options?: SpawnOptions): void;
  kill(): void;
  isRunning(): boolean;
  onOutput(callback: OutputCallback): void;
  onExit(callback: ExitCallback): void;
  offOutput(callback: OutputCallback): void;
  offExit(callback: ExitCallback): void;
  removeAllListeners(): void;
}
```

**Backward Compatibility**: Callers (WorkflowOrchestrator, tests) do not need changes.

### Data Model

No schema changes. Existing data structures remain:

- `workflow-state.json` - unchanged
- `tasks.md` - unchanged
- Story directory structure - unchanged

### Key Decisions

#### Decision 1: Use `-p` Flag vs stdin

**Context**: Need to pass prompts to Claude CLI without temp files.

**Options Considered**:
1. **`-p` flag** - Pass prompt as command argument
   - Pros: Proven in loop.sh, no buffering issues, works reliably
   - Cons: Subject to ARG_MAX limits (~1MB macOS, ~2MB Linux)
2. **stdin via execa `input` option** - Write to stdin
   - Pros: No size limits, documented execa feature
   - Cons: Code comment says "doesn't work reliably with Claude CLI"
3. **Named pipe (FIFO)** - Create pipe, write prompt, read from it
   - Pros: No size limits, no temp files on disk
   - Cons: Complex, platform-specific, overkill for this use case

**Decision**: Option 1 (`-p` flag)

**Rationale**:
- loop.sh has proven this works reliably at line 429
- Typical prompts are 50-100KB, well under ARG_MAX limits
- Simplest solution that matches working reference implementation

#### Decision 2: JSONL Parsing vs Raw Output

**Context**: Need to extract meaningful content from Claude's streaming output.

**Options Considered**:
1. **Parse JSONL** - Use `--output-format stream-json`, parse each line
   - Pros: Structured data, can differentiate text vs tool_use, real-time
   - Cons: Need parser implementation, format may change between versions
2. **Raw text output** - Use `--print` flag, display as-is
   - Pros: Simple, no parsing needed
   - Cons: No streaming (waits for completion), no structure
3. **Hybrid** - Try JSONL, fall back to raw
   - Pros: Resilient to format changes
   - Cons: Complexity, harder to test

**Decision**: Option 1 (Parse JSONL)

**Rationale**:
- Research confirms `--output-format stream-json` is required for real-time streaming
- JSONL format is documented and stable
- Parser is straightforward (~100 lines) and testable

#### Decision 3: Environment Configuration

**Context**: GitHub Issue #771 documents that Claude CLI hangs without specific env vars.

**Options Considered**:
1. **Set `ANTHROPIC_API_KEY: ''` explicitly** - Empty string in env
   - Pros: Documented fix, prevents hang
   - Cons: Non-obvious, may break if Claude CLI changes behavior
2. **Delete `ANTHROPIC_API_KEY` from env** - Remove entirely
   - Pros: Clean environment
   - Cons: May not work, untested
3. **Set to actual key value** - Real API key
   - Pros: Normal usage pattern
   - Cons: Already tried by default, causes hang

**Decision**: Option 1 (Set to empty string)

**Rationale**:
- GitHub Issue #771 specifically documents this fix
- User environment already has the real key; empty string overrides it
- The hang occurs because Claude CLI waits for key input when spawned from Node.js

#### Decision 4: stdio Configuration

**Context**: Need proper stream handling for subprocess.

**Options Considered**:
1. **`['inherit', 'pipe', 'pipe']`** - Inherit stdin, pipe stdout/stderr
   - Pros: Documented requirement (GH #771), allows streaming
   - Cons: stdin inheritance may be unnecessary
2. **`['pipe', 'pipe', 'pipe']`** - Pipe all
   - Pros: Full control
   - Cons: May cause stdin issues
3. **`['ignore', 'pipe', 'pipe']`** - Ignore stdin
   - Pros: No stdin concerns
   - Cons: Untested with Claude CLI

**Decision**: Option 1

**Rationale**:
- GitHub Issue #771 specifies this exact configuration
- `inherit` for stdin allows Claude CLI to detect non-interactive mode correctly

## Test Architecture

### File Structure

```
packages/tui/tests/
  unit/
    claudeRunner.test.ts      # Core spawn logic tests
    jsonlParser.test.ts       # JSONL parser tests (new file)
  e2e/
    ipc-reliability.test.ts   # End-to-end IPC tests (new file)
  fixtures/
    sample-jsonl-output.txt   # Sample Claude JSONL output
    large-prompt.txt          # 50KB test prompt
```

### Test Categories

#### Unit Tests: ClaudeRunner (`claudeRunner.test.ts`)

```typescript
describe('ClaudeRunner', () => {
  describe('spawn()', () => {
    it('uses -p flag instead of temp files', () => {
      // Mock execa, verify args
    });

    it('sets ANTHROPIC_API_KEY to empty string', () => {
      // Verify env configuration
    });

    it('uses --output-format stream-json', () => {
      // Verify flag presence
    });

    it('handles prompts with special characters', () => {
      // Test: $VAR, `backticks`, "quotes", newlines
    });

    it('handles 50KB prompts without ARG_MAX errors', () => {
      // Large prompt test
    });

    it('does not create temp files', () => {
      // Verify no files in tmpdir()
    });
  });

  describe('error handling', () => {
    it('reports Claude CLI not found', () => {});
    it('reports non-zero exit codes', () => {});
    it('handles process crash (SIGSEGV)', () => {});
  });
});
```

#### Unit Tests: JsonlParser (`jsonlParser.test.ts`)

```typescript
describe('JsonlStreamParser', () => {
  it('parses text_delta events', () => {
    const parser = new JsonlStreamParser();
    const input = '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n';
    const msgs = parser.parse(input);
    expect(msgs).toEqual([{ type: 'text', content: 'Hello' }]);
  });

  it('handles partial lines across chunks', () => {
    const parser = new JsonlStreamParser();
    parser.parse('{"type":"content_block');
    const msgs = parser.parse('_delta","delta":{"type":"text_delta","text":"Hi"}}\n');
    expect(msgs).toEqual([{ type: 'text', content: 'Hi' }]);
  });

  it('extracts tool_use events', () => {
    // Test tool_use parsing
  });

  it('skips malformed JSON lines', () => {
    // Garbage input should not throw
  });

  it('flushes remaining buffer on end', () => {
    // Test flush() method
  });
});
```

#### E2E Tests: IPC Reliability (`ipc-reliability.test.ts`)

```typescript
describe('TUI IPC Reliability', () => {
  it('spawns Claude with correct configuration', async () => {
    // Verify spawn args match design
  });

  it('receives streaming output in real-time', async () => {
    // Mock Claude, verify output callback timing
  });

  it('handles Claude process exit correctly', async () => {
    // Verify exit callback with code
  });

  it('no temp files created during execution', async () => {
    // List /tmp before/after, verify no new files
  });
});
```

### Test Fixtures

**`fixtures/sample-jsonl-output.txt`**:
```json
{"type":"message_start","message":{"id":"msg_01XFDUDYJgAACzvnptvVoYEL","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":1}}}
{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}
{"type":"content_block_stop","index":0}
{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":12}}
{"type":"message_stop"}
```

### Mocking Strategy

**Mock execa**: Use Vitest's mock system to replace `execa()`:

```typescript
import { vi } from 'vitest';
import { execa } from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn(() => ({
    pid: 12345,
    stdout: new MockReadable(),
    stderr: new MockReadable(),
    then: (resolve: Function) => resolve({ exitCode: 0 }),
    catch: () => {},
    kill: vi.fn(),
  })),
}));
```

## Design Simulation

### Flow 1: Normal Execution

```
1. WorkflowOrchestrator.executeNextTask()
   |
   v
2. buildPrompt(context) -> prompt string (50KB)
   |
   v
3. runner.spawn(prompt, { cwd: projectDir })
   |
   v
4. ClaudeRunnerImpl.spawn():
   - execa('claude', ['-p', prompt, '--output-format', 'stream-json'], {
       stdio: ['inherit', 'pipe', 'pipe'],
       env: { ...process.env, ANTHROPIC_API_KEY: '' }
     })
   - Process spawned with PID 12345
   |
   v
5. stdout.on('data', chunk):
   - JsonlStreamParser.parse(chunk)
   - For each text_delta: notifyOutput(text)
   - UI updates in real-time
   |
   v (after ~30 seconds)
6. Process exits with code 0:
   - flush remaining buffer
   - notifyExit(0)
   - WorkflowOrchestrator marks task complete
```

### Flow 2: Large Prompt (50KB)

```
1. promptBuilder creates 50KB prompt:
   - Task context: 5KB
   - design.md embedded: 20KB
   - research-notes.md embedded: 15KB
   - tasks.md embedded: 10KB
   |
   v
2. spawn() called with 50KB prompt:
   - ARG_MAX check: 50KB << 1MB (macOS limit) = OK
   - execa(['claude', '-p', <50KB string>])
   |
   v
3. OS passes args to Claude CLI:
   - No truncation (within limits)
   - Claude receives complete prompt
   |
   v
4. Execution proceeds normally (same as Flow 1)
```

### Flow 3: Error - Claude CLI Not Found

```
1. runner.spawn(prompt) called
   |
   v
2. execa('claude', [...]) throws:
   - Error: ENOENT: spawn claude ENOENT
   |
   v
3. catch block in spawn():
   - notifyOutput('[Error] Failed to spawn process: spawn claude ENOENT')
   - notifyExit(1)
   |
   v
4. WorkflowOrchestrator.handleExit(1):
   - Task remains as 'in_progress'
   - Output: 'Task failed with exit code 1'
   - User can retry
```

### Flow 4: Error - Non-Zero Exit

```
1. Claude CLI runs but returns error:
   - API rate limit
   - Invalid prompt
   - Network timeout
   |
   v
2. Process exits with code 1:
   - stderr may contain error message
   |
   v
3. handleExit called:
   - notifyOutput('[Error] Process exited with code 1')
   - notifyExit(1)
   |
   v
4. WorkflowOrchestrator:
   - Skip validation (code != 0)
   - Task remains 'in_progress'
   - User sees error in output panel
```

### Flow 5: JSONL Parsing - Partial Lines

```
1. First chunk received: '{"type":"content_block'
   - JsonlStreamParser.parse() buffers incomplete line
   - Returns: []
   |
   v
2. Second chunk: '_delta","delta":{"text":"Hi"}}\n{"type":'
   - Buffer becomes complete: '{"type":"content_block_delta","delta":{"text":"Hi"}}'
   - Parse complete line, extract text
   - Buffer remaining: '{"type":'
   - Returns: [{ type: 'text', content: 'Hi' }]
   |
   v
3. Third chunk: '"message_stop"}\n'
   - Complete: '{"type":"message_stop"}'
   - Parse, no text content
   - Returns: []
   |
   v
4. Stream end:
   - flush() called
   - Buffer empty, nothing to return
```

## Implementation Notes

### Order of Changes

1. **Create `jsonlParser.ts`** with unit tests (RED -> GREEN)
2. **Create `claudeRunner.test.ts`** unit tests for new spawn logic (RED)
3. **Refactor `claudeRunner.ts`** to use new spawn pattern (GREEN)
4. **Remove temp file imports and logic**
5. **Integrate JSONL parser** into stream handler
6. **Create `ipc-reliability.test.ts`** E2E tests
7. **Run full test suite** to verify no regressions

### Code Removal Checklist

From `claudeRunner.ts`:
- [ ] Remove `import { writeFileSync, unlinkSync } from 'fs';`
- [ ] Remove `import { join } from 'path';`
- [ ] Remove `import { tmpdir } from 'os';`
- [ ] Remove `private tempFile: string | null = null;`
- [ ] Remove `cleanupTempFile()` method (lines 171-180)
- [ ] Remove all calls to `this.cleanupTempFile()`
- [ ] Remove temp file creation logic (lines 106-107)

### Environment Variable Details

```typescript
env: {
  ...process.env,          // Inherit all env vars
  ANTHROPIC_API_KEY: '',   // Override with empty string (GH #771)
  FORCE_COLOR: '1',        // Keep colored output
  ...options.env,          // Allow caller overrides
}
```

**Why empty string, not delete?**: The parent process likely has `ANTHROPIC_API_KEY` set. Setting to empty string explicitly overrides it. Deleting would leave the original value which causes the hang.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ARG_MAX limit exceeded on large prompts | Low | High | Monitor prompt sizes; add warning at 200KB; fallback to stdin if needed |
| Claude CLI JSONL format changes | Low | Medium | Parser handles unknown events gracefully; add integration test with real CLI |
| `ANTHROPIC_API_KEY: ''` trick stops working | Low | High | Pin to known-working Claude CLI version; monitor GitHub issues |
| Windows compatibility (32KB ARG_MAX) | Medium | Medium | Out of scope for now; document limitation; consider stdin fallback later |
| Existing tests break due to mock changes | Low | Low | Update mocks to match new spawn signature; verify all tests pass |
| Performance regression | Very Low | Low | New approach is simpler; benchmark IPC overhead before/after |

## Open Questions

- [x] ~~Exact JSONL format from Claude CLI~~ - Documented in user-story.md lines 207-225
- [x] ~~Does `ANTHROPIC_API_KEY: ''` fix really work?~~ - Confirmed via GitHub Issue #771
- [x] ~~Maximum safe prompt size~~ - 100KB tested in loop.sh, ARG_MAX is ~1MB
- [ ] Windows support timeline (32KB limit may require stdin fallback)
- [ ] Claude CLI version compatibility range for `-p` and `--output-format` flags

## Summary

This design refactors `ClaudeRunnerImpl.spawn()` to:

1. **Use direct `execa()` spawn** with `-p` flag instead of temp file + shell piping
2. **Add critical environment configuration** (`ANTHROPIC_API_KEY: ''`, `stdio: inherit`)
3. **Parse JSONL streaming output** for real-time display
4. **Remove all temp file logic** for cleaner, more reliable code

The solution is proven by `scripts/loop.sh` and documented in GitHub Issue #771. Implementation is straightforward refactoring of a single file with a new ~100-line parser component.
