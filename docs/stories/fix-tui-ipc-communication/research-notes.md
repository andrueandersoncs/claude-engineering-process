# Research Notes: Fix TUI IPC Communication

## Relevant Code Locations

### Primary Files (IPC Implementation)
- `packages/tui/src/services/claudeRunner.ts:84-166` - Current spawn implementation using temp file + shell piping
- `packages/tui/src/services/claudeRunner.ts:104-120` - Temp file creation and `cat | claude` command
- `packages/tui/src/services/claudeRunner.ts:171-179` - Temp file cleanup logic
- `packages/tui/src/services/claudeRunner.ts:186-189` - Stream data handlers

### Secondary Files (Context)
- `packages/tui/src/services/workflowOrchestrator.ts:216` - Calls `runner.spawn(prompt, { cwd: this.projectDir })`
- `packages/tui/src/services/workflowOrchestrator.ts:308-345` - Validation script execution using execa
- `packages/tui/src/services/promptBuilder.ts:38-111` - Builds prompts with embedded context (can be large)

### Working Reference Pattern
- `scripts/loop.sh:429` - Proven reliable: `$CLAUDE_BIN -p "$prompt"`

### Test Infrastructure
- `packages/tui/tests/e2e/setupViewWorkflow.test.tsx:24-76` - Mock ClaudeRunner pattern
- `packages/tui/tests/unit/infrastructure.test.ts` - Test infrastructure validation
- `packages/tui/vitest.config.ts` - Test configuration (Vitest with Node environment)

## Verified Assumptions

### Confirmed (✓)
- [x] **Temp file + shell piping causes hang** - User report: 100% reproducible
- [x] **`loop.sh` pattern works** - Uses `claude -p "$prompt"` at line 429
- [x] **Missing `ANTHROPIC_API_KEY: ''` causes hang** - GitHub Issue #771
- [x] **No `--output-format stream-json`** - Prevents real-time streaming
- [x] **Prompt sizes 50KB-100KB** - promptBuilder embeds multiple large files
- [x] **Test infrastructure uses Vitest** - `package.json:20-22`, `vitest.config.ts`
- [x] **execa v8.0.1** - From `package.json:31`, supports direct argv

### Refuted (✗)
- [ ] **Direct stdin via execa works reliably** - Code comment at line 85 says otherwise, use `-p` flag
- [ ] **Current implementation streams** - Uses `buffer: true` which contradicts streaming

## Ontology Check

| Entity/Role | Expected | Actual in Codebase | Gap? |
|-------------|----------|-------------------|------|
| Spawn Claude | Direct spawn with argv | Shell cmd via `execaCommand()` | **PATTERN MISMATCH** |
| Temp file | Should not exist | Created at `claudeRunner.ts:106` | **VIOLATES AC1** |
| Flag: `-p` | For passing prompts | Not used | **MISSING** |
| Flag: `--output-format` | For streaming JSONL | Not used | **MISSING** |
| Env: `ANTHROPIC_API_KEY` | Must be `''` | Not set explicitly | **CRITICAL MISSING** |
| Env: `FORCE_COLOR` | Should be `'1'` | Set correctly at line 99 | ✓ OK |
| stdin | Should use `'inherit'` | Not specified | **MISSING** |
| Method | `execa()` direct | `execaCommand()` string | **PATTERN MISMATCH** |

## Detected Contradictions

| Requirement A | Requirement B | Tension | Status |
|---------------|---------------|---------|--------|
| "Real-time streaming" | `buffer: true` (line 119) | **CONFLICT** | Resolved: Remove buffer, add stream-json |
| "No temp files" | "execa stdin unreliable" | **CONFLICT** | Resolved: Use `-p` flag |
| "Must work reliably" | Using shell piping | **CONFLICT** | Resolved: Switch to direct execa |
| AC3 "real-time output" | AC2 argv size limits | **TENSION** | OK: 50-100KB under ARG_MAX |

**All contradictions have clear resolutions. No UNRESOLVED conflicts.**

## Patterns to Follow

### Error Handling
- Use try-catch with specific error messages
- Reference: `workflowOrchestrator.ts:322-345`

### Process Spawning (Working Pattern)
```bash
# From loop.sh:429
$CLAUDE_BIN -p "$prompt"
```

### Stream Handling
```typescript
// From claudeRunner.ts:186-189
stream.on('data', (chunk: Buffer) => {
  const text = chunk.toString();
  this.notifyOutput(text);
});
```

### Testing (TDD Required)
- Tests BEFORE implementation
- Tests must FAIL first (Red)
- Then implement (Green)
- Reference: `CLAUDE.md:11-16`

## Test Infrastructure (REQUIRED)

### Framework & Configuration
- E2E Framework: Vitest + ink-testing-library
- Unit Framework: Vitest
- Config files: `packages/tui/vitest.config.ts`

### Running Tests
```bash
# All tests
cd packages/tui && npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Existing Test Patterns
- Test file location: `packages/tui/tests/`
- Mock pattern: `tests/e2e/setupViewWorkflow.test.tsx:24-76`
- Vitest config: `vitest.config.ts` (Node env, 10s timeout)

## Dependencies & Constraints

### Current Dependencies
- `execa` v8.0.1 - Subprocess spawning
- `ink` v5.0.1 - Terminal UI
- `vitest` v1.6.0 - Testing
- `ink-testing-library` v4.0.0 - Ink testing

**No New Dependencies Required**

### Platform Constraints
- Node.js ≥20.0.0
- macOS: ARG_MAX = 1MB (prompts ~50-100KB = OK)
- Linux: ARG_MAX = 2MB (OK)
- Windows: ARG_MAX = 32KB (may need fallback)

## Files to Modify

| File | Purpose | Risk |
|------|---------|------|
| `packages/tui/src/services/claudeRunner.ts` | Core IPC refactor | **HIGH** |
| `packages/tui/tests/unit/claudeRunner.test.ts` | New test file | Low |
| `packages/tui/tests/e2e/ipc-reliability.test.ts` | New test file | Low |

## Recommendations for Design

1. **Replace shell piping with direct execa:**
   ```typescript
   execa('claude', ['-p', '--output-format', 'stream-json', prompt], {
     stdio: ['inherit', 'pipe', 'pipe'],
     env: { ...process.env, ANTHROPIC_API_KEY: '' },
   });
   ```

2. **Implement JSONL parser for streaming output**
3. **Remove all temp file logic**
4. **Add timeout protection (10 min default)**
5. **Follow TDD: Write failing tests first**

## Open Questions Remaining

- [ ] Exact JSONL format from current Claude Code version (need to test)
- [ ] Windows compatibility (32KB ARG_MAX may need fallback)

## Summary

**Root Cause Confirmed**: Missing Node.js spawn config (GitHub Issue #771)
- Missing `ANTHROPIC_API_KEY: ''`
- Missing `--output-format stream-json`
- Using shell piping instead of direct `-p` flag

**Solution Confidence: VERY HIGH**
- GitHub Issue #771 documents exact fix
- `loop.sh` proves pattern works
- Straightforward refactoring of single file
