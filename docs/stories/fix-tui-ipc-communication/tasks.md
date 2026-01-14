# Tasks: Fix TUI IPC Communication

## Overview

This task breakdown implements the design for fixing TUI IPC communication.
See [design.md](./design.md) for full architecture and decisions.

**Goal**: Replace temp file + shell piping with direct `-p` flag spawn and JSONL parsing.

**Primary file**: `packages/tui/src/services/claudeRunner.ts`

---

## Tasks

### Phase 1: Test Infrastructure (TDD - Red)

- [x] **Task 1.1**: Create JSONL parser unit tests (~1h)
  - **Files**: `packages/tui/tests/unit/jsonlParser.test.ts` (new)
  - **Description**: Write failing tests for JsonlStreamParser
  - **Criteria**:
    - Test parsing text_delta events
    - Test parsing tool_use events
    - Test partial line buffering across chunks
    - Test malformed JSON handling (skip, don't throw)
    - Test flush() for remaining buffer
  - **Dependencies**: None

- [x] **Task 1.2**: Create ClaudeRunner spawn tests (~1h)
  - **Files**: `packages/tui/tests/unit/claudeRunner.test.ts` (new)
  - **Description**: Write failing tests for new spawn implementation
  - **Criteria**:
    - Test execa called with `-p` flag
    - Test `--output-format stream-json` flag present
    - Test `ANTHROPIC_API_KEY: ''` in env
    - Test stdio configured as `['inherit', 'pipe', 'pipe']`
    - Test no temp files created (mock fs, verify no writeFileSync calls)
    - Test large prompt (50KB) handling
    - Test special characters in prompt
  - **Dependencies**: None

- [x] **Task 1.3**: Create E2E IPC reliability test (~1h)
  - **Files**: `packages/tui/tests/e2e/ipc-reliability.test.ts` (new)
  - **Description**: Write E2E test for complete spawn flow
  - **Criteria**:
    - Test spawn with mock Claude process
    - Test streaming output received in order
    - Test exit callback invoked with correct code
    - Verify no temp files in system tmpdir
  - **Dependencies**: None

### Phase 2: JSONL Parser Implementation (TDD - Green)

- [x] **Task 2.1**: Implement JsonlStreamParser class (~1.5h)
  - **Files**: `packages/tui/src/services/jsonlParser.ts` (new)
  - **Description**: Create JSONL parser following design specification
  - **Criteria**:
    - Implements JsonlMessage interface
    - parse() method handles partial lines with buffer
    - flush() method returns remaining buffered content
    - parseLine() extracts text_delta, tool_use, result events
    - Skips malformed JSON without throwing
    - Task 1.1 tests pass
  - **Dependencies**: 1.1

- [x] **Task 2.2**: Export parser from services index (~15m)
  - **Files**: `packages/tui/src/services/index.ts`
  - **Description**: Add JsonlStreamParser export
  - **Criteria**:
    - Export `JsonlStreamParser` class
    - Export `JsonlMessage` interface
  - **Dependencies**: 2.1

### Phase 3: ClaudeRunner Refactor (TDD - Green)

- [x] **Task 3.1**: Refactor spawn() method (~1.5h)
  - **Files**: `packages/tui/src/services/claudeRunner.ts`
  - **Description**: Replace execaCommand with direct execa spawn
  - **Criteria**:
    - Use `execa()` instead of `execaCommand()`
    - Pass prompt via `-p` flag
    - Add `--output-format stream-json` flag
    - Set env: `ANTHROPIC_API_KEY: ''`
    - Set stdio: `['inherit', 'pipe', 'pipe']`
    - Remove `buffer: true` option
    - Task 1.2 tests pass
  - **Dependencies**: 1.2

- [x] **Task 3.2**: Remove temp file logic (~30m)
  - **Files**: `packages/tui/src/services/claudeRunner.ts`
  - **Description**: Delete all temp file related code
  - **Criteria**:
    - Remove fs imports (writeFileSync, unlinkSync)
    - Remove path import (join)
    - Remove os import (tmpdir)
    - Remove `tempFile` property
    - Remove `cleanupTempFile()` method
    - Remove all cleanupTempFile() calls
    - No temp file code remains
  - **Dependencies**: 3.1

- [x] **Task 3.3**: Integrate JSONL parser (~1h)
  - **Files**: `packages/tui/src/services/claudeRunner.ts`
  - **Description**: Use JsonlStreamParser in stream handler
  - **Criteria**:
    - Import JsonlStreamParser
    - Create parser instance in ClaudeRunnerImpl
    - Modify setupStreamHandler to parse chunks
    - Extract text content and call notifyOutput
    - Handle tool_use events (format as log message)
    - Flush parser on stream end
    - E2E tests (1.3) pass
  - **Dependencies**: 2.1, 3.2

### Phase 4: Verification (TDD - Refactor)

- [x] **Task 4.1**: Run full test suite (~30m)
  - **Files**: All test files
  - **Description**: Verify all tests pass with new implementation
  - **Criteria**:
    - `npm run test` passes
    - `npm run test:coverage` shows >= 80% for claudeRunner.ts
    - `npm run test:coverage` shows >= 80% for jsonlParser.ts
    - No regressions in existing tests
  - **Dependencies**: 3.3

- [~] **Task 4.2**: Manual integration test (~30m)
  - **Files**: None (manual testing)
  - **Description**: Test with real Claude CLI
  - **Criteria**:
    - Start TUI with existing story
    - Execute a task
    - Verify streaming output appears in real-time
    - Verify task completes successfully
    - Verify no temp files in /tmp after completion
  - **Dependencies**: 4.1

### Phase 5: Documentation

- [x] **Task 5.1**: Update inline documentation (~30m)
  - **Files**: `packages/tui/src/services/claudeRunner.ts`, `packages/tui/src/services/jsonlParser.ts`
  - **Description**: Update JSDoc comments to reflect new implementation
  - **Criteria**:
    - Remove outdated temp file references in comments
    - Document JSONL parsing in stream handler
    - Document env configuration requirements (ANTHROPIC_API_KEY: '', stdio config)
    - Add @see reference to GitHub Issue #771
  - **Dependencies**: 4.1

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1. Test Infrastructure | 1.1, 1.2, 1.3 | 3h |
| 2. JSONL Parser | 2.1, 2.2 | 1.75h |
| 3. ClaudeRunner Refactor | 3.1, 3.2, 3.3 | 3h |
| 4. Verification | 4.1, 4.2 | 1h |
| 5. Documentation | 5.1 | 0.5h |
| **Total** | **10 tasks** | **~9.25h** |

## Dependencies Graph

```
1.1 ─────────────────────────────────────> 2.1 ──> 2.2 ─┐
                                                         │
1.2 ──────────────────────────────────────────────────> 3.1 ──> 3.2 ──> 3.3 ─┐
                                                                              │
1.3 ─────────────────────────────────────────────────────────────────────────┤
                                                                              │
                                                                              v
                                                                            4.1 ──> 4.2 ──> 5.1
```

## Test Commands

```bash
# Run all tests
cd packages/tui && npm run test

# Run specific test file
npm run test -- tests/unit/jsonlParser.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

## Files Modified Summary

| File | Change Type |
|------|-------------|
| `packages/tui/src/services/jsonlParser.ts` | New |
| `packages/tui/src/services/claudeRunner.ts` | Modified |
| `packages/tui/src/services/index.ts` | Modified |
| `packages/tui/tests/unit/jsonlParser.test.ts` | New |
| `packages/tui/tests/unit/claudeRunner.test.ts` | New |
| `packages/tui/tests/e2e/ipc-reliability.test.ts` | New |
