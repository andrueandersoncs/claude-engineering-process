# Assumptions: Fix TUI IPC Communication

## Date
2026-01-14

## Documented Assumptions

### Assumption 1: Temp File + Shell Piping is the Root Cause

**Gap**: User said "it doesn't work" without specifying exact failure mode (hangs, crashes, wrong output, etc.)

**Assumption**: The current implementation using `cat tempfile | claude --print` via shell command is unreliable and causes intermittent failures.

**Rationale**:
- Code comment at line 85 states: "execa's direct stdin input doesn't work reliably with Claude CLI for long prompts"
- Implementation already recognizes stdin reliability issues
- User specifically called out "piping input and output" as flawed
- Shell piping introduces multiple failure points: file I/O, shell interpretation, process coordination

**Risk if Wrong**: High - If the actual problem is elsewhere (e.g., Claude CLI bugs, prompt size limits, network issues), fixing IPC won't resolve symptoms.

**Verification**:
- User to provide specific failure symptoms: Does it hang? Does it crash? Does it produce no output?
- User to share error logs or terminal output when failure occurs
- User to test if `scripts/loop.sh` (which uses `-p` flag) has similar failures

**Confidence Level**: High (80%)

---

### Assumption 2: Claude CLI `-p` Flag is More Reliable Than stdin Piping

**Gap**: No explicit comparison of `-p` vs stdin in documentation

**Assumption**: Using Claude CLI's `-p "prompt text"` flag directly (as loop.sh does) is more reliable than piping via stdin/temp files.

**Rationale**:
- `scripts/loop.sh` uses `-p` flag successfully (line 429)
- `-p` flag is documented in Claude CLI reference
- Passing arguments is more straightforward than shell piping
- Eliminates temp file I/O race conditions
- No shell interpretation of special characters

**Risk if Wrong**: Medium - If `-p` flag has size limits or its own issues, we'd trade one problem for another.

**Verification**:
- Test Claude CLI with `-p` and very long prompts (10KB+)
- Check Claude CLI docs for `-p` flag limitations
- User confirms loop.sh doesn't have same failures as TUI

**Confidence Level**: High (85%)

---

### Assumption 3: User Wants to Keep Using Claude CLI (Not Switch to API)

**Gap**: User didn't specify if Claude CLI is a hard requirement

**Assumption**: The solution must continue using the Claude CLI binary, not switch to direct API calls or a different LLM client.

**Rationale**:
- Entire codebase is built around Claude CLI (plugin system, commands, skills)
- User framed it as "fix the TUI package" not "rewrite the architecture"
- loop.sh, validation scripts, and hooks all use Claude CLI
- No API keys or credentials management exists in codebase

**Risk if Wrong**: Medium - If user is open to API-based solutions, we have more options (HTTP requests, streaming APIs, etc.)

**Verification**:
- User to confirm Claude CLI is mandatory
- Or user open to API-based approach if it's more reliable?

**Confidence Level**: High (90%)

---

### Assumption 4: Failures are Intermittent, Not Deterministic

**Gap**: "doesn't work" could mean "never works" or "works sometimes"

**Assumption**: The TUI works sometimes but fails unpredictably, rather than failing 100% of the time.

**Rationale**:
- If it never worked, it would have been caught in development/testing
- Intermittent failures are characteristic of race conditions (file writes, stream buffering, process timing)
- User said "destined for failure" (implying future/occasional failures) rather than "completely broken"

**Risk if Wrong**: Low - If it never works, the fix still applies. If it always works, user wouldn't have reported it.

**Verification**:
- User to describe failure frequency: Always? Sometimes? Under what conditions?
- Are failures more common with large prompts? Long-running tasks? Specific OS/terminal?

**Confidence Level**: Medium (70%)

---

### Assumption 5: Prompt Size Can Be Very Large (Multi-KB)

**Gap**: No explicit size limits discussed

**Assumption**: Task prompts can be 10KB-100KB+ when embedding design docs, research notes, and task context.

**Rationale**:
- `promptBuilder.ts` embeds multiple files: tasks.md, design.md, research-notes.md
- Design docs can be thousands of lines
- loop.sh embeds same context (lines 246-322)
- User mentioned "long prompts" indirectly via code comment

**Risk if Wrong**: Low - If prompts are small, both current and proposed solutions work fine.

**Verification**:
- Measure actual prompt sizes in typical use cases
- Test `-p` flag with 50KB, 100KB, 500KB prompts
- Check for shell argument length limits (ARG_MAX on Linux/macOS)

**Confidence Level**: High (85%)

---

### Assumption 6: stdout Streaming Must Be Real-Time

**Gap**: No explicit requirement for streaming vs. buffered output

**Assumption**: TUI must display Claude's output in real-time as it generates (streaming), not wait for completion.

**Rationale**:
- Dashboard has live output panel (src/components/Dashboard.tsx)
- User experience requires seeing progress
- Long-running tasks (minutes) need feedback
- Current implementation sets up stream handlers (lines 132-140)

**Risk if Wrong**: Medium - If buffered output is acceptable, implementation is simpler.

**Verification**:
- User to confirm: Is real-time streaming required, or can output appear at task completion?
- Does current TUI actually stream output properly, or does it buffer?

**Confidence Level**: High (80%)

---

### Assumption 7: Alternative IPC (Sockets, HTTP) Not Feasible Without Claude CLI Changes

**Gap**: Claude CLI capabilities not fully documented

**Assumption**: Claude CLI only supports stdin/stdout communication and doesn't have built-in socket/HTTP server modes.

**Rationale**:
- Research found no documentation for socket/HTTP modes
- CLI tools traditionally use stdio
- Adding sockets would require wrapping Claude CLI in another process
- User wants a fix, not a major refactor

**Risk if Wrong**: Low - If Claude CLI supports alternative IPC, we'd still prefer simpler `-p` flag approach first.

**Verification**:
- Check `claude --help` for undocumented flags
- Review Claude CLI source if available
- Ask user if they've explored Claude CLI's full capabilities

**Confidence Level**: High (85%)

---

### Assumption 8: Cross-Platform Compatibility (macOS, Linux, Windows) is Required

**Gap**: Target platforms not specified

**Assumption**: Solution must work on macOS, Linux, and Windows (WSL at minimum).

**Rationale**:
- README mentions "Node.js 20+ LTS" (cross-platform)
- Uses cross-platform tools (Node.js, execa, Ink)
- No OS-specific code comments
- Professional tool should support major OSes

**Risk if Wrong**: Low - If targeting only macOS/Linux, more options available (Unix-specific features).

**Verification**:
- User to specify target platforms
- Are Windows users expected? (If yes, must test on Windows)

**Confidence Level**: Medium (75%)

---

### Assumption 9: Temp File Cleanup Issues Are Contributing to Failures

**Gap**: No evidence of cleanup failures in provided code

**Assumption**: Temp files sometimes aren't cleaned up on crash/error, leading to disk space issues or stale file reads.

**Rationale**:
- Cleanup happens in finally-style blocks (lines 171-179)
- If process crashes hard (SIGKILL), cleanup may not run
- Accumulating temp files in `/tmp` could cause issues over time
- File-based IPC generally has cleanup complexity

**Risk if Wrong**: Low - Eliminating temp files eliminates this risk regardless.

**Verification**:
- Check `/tmp` for leftover `claude-prompt-*` files after TUI crashes
- User to monitor `/tmp` disk usage during heavy TUI use

**Confidence Level**: Medium (65%)

---

### Assumption 10: Error Messages Are Insufficient for Debugging

**Gap**: Don't know what error output looks like when it fails

**Assumption**: When the TUI fails, error messages don't clearly indicate the root cause.

**Rationale**:
- User said "doesn't work" without mentioning helpful error messages
- Generic error handlers catch exceptions but may not log details
- Stream errors may be swallowed (lines 199-201: "Ignore callback errors")

**Risk if Wrong**: Low - Better error handling helps regardless.

**Verification**:
- User to share error output when failure occurs
- Add verbose logging mode to TUI for debugging

**Confidence Level**: Medium (70%)

---

### Assumption 11: File Watching (chokidar) Doesn't Interfere with IPC

**Gap**: No analysis of chokidar interaction with spawned processes

**Assumption**: The file watcher monitoring workflow-state.json and tasks.md doesn't interfere with Claude CLI subprocess I/O.

**Rationale**:
- File watcher is separate concern (monitoring story files)
- Claude CLI writes to cwd, not story directory
- No obvious overlap in file access
- Different layers of abstraction

**Risk if Wrong**: Medium - If file watching causes locks or I/O contention, it could affect reliability.

**Verification**:
- Disable file watching temporarily to see if issues persist
- Monitor file descriptor usage during TUI operation

**Confidence Level**: High (80%)

---

### Assumption 12: Claude CLI Exit Codes are Reliable

**Gap**: No documentation of Claude CLI exit code semantics

**Assumption**: Claude CLI returns exit code 0 on success, non-zero on failure, consistently.

**Rationale**:
- Standard Unix convention
- Validation logic checks `exitCode === 0` (line 340)
- loop.sh relies on exit codes for task completion

**Risk if Wrong**: Medium - If Claude CLI has inconsistent exit codes, success detection fails.

**Verification**:
- Test Claude CLI exit codes for various scenarios (success, error, timeout, Ctrl+C)
- Document expected exit code meanings

**Confidence Level**: High (85%)

---

## Counterfactual Probes

### Probe 1: Alternative IPC Mechanism

**Original Request**: "fix the tui package, it doesn't work... maybe we should try different approaches for communicating between the processes (TUI <-> claude code CLI)"

**Variant 1**: Should we use Unix domain sockets for bidirectional communication?

**Assumed Answer**: No - sockets require Claude CLI modifications we can't make. The `-p` flag approach is simpler and doesn't require protocol changes.

**Constraint Revealed**: Solution must work with Claude CLI as-is, no wrapper processes or protocol changes.

---

**Variant 2**: Should we use HTTP/WebSocket for IPC?

**Assumed Answer**: No - too heavyweight for local subprocess communication. Adds dependencies (express, ws), port management complexity, and doesn't provide significant benefits over `-p` flag.

**Constraint Revealed**: Solution should minimize new dependencies and complexity.

---

**Variant 3**: Should we use file-based IPC with file watching?

**Assumed Answer**: No - user specifically said piping (file I/O-based approach) is "destined for failure." Moving from temp files to watched files doesn't address the core concern.

**Constraint Revealed**: User wants to move AWAY from file-based approaches, not refine them.

---

### Probe 2: Scope of "Doesn't Work"

**Original Request**: "fix the tui package, it doesn't work"

**Variant 1**: Does the entire TUI not work (doesn't launch)?

**Assumed Answer**: No - TUI likely launches and renders, but fails during task execution. Similar to existing story `tui-create-story-no-output` where specific flows break.

**Constraint Revealed**: Issue is with the Claude CLI subprocess integration, not the UI framework itself.

---

**Variant 2**: Does it work sometimes but fail other times (intermittent)?

**Assumed Answer**: Yes - likely intermittent failures due to race conditions in file I/O, shell piping, or stream buffering.

**Constraint Revealed**: Must improve reliability and add error recovery, not just fix deterministic bugs.

---

**Variant 3**: Does it fail with specific error messages or silently?

**Assumed Answer**: Uncertain - user didn't mention errors, suggesting either silent failures or unhelpful error messages.

**Constraint Revealed**: Must improve error reporting and logging as part of fix.

---

### Probe 3: Acceptable Alternatives to Claude CLI

**Original Request**: "communicating between the processes (TUI <-> claude code CLI)"

**Variant 1**: Is switching from Claude CLI to Claude API acceptable?

**Assumed Answer**: No - entire plugin architecture assumes Claude CLI. No API client code exists. Would be a major rewrite.

**Constraint Revealed**: Claude CLI is mandatory, not negotiable.

---

**Variant 2**: Is wrapping Claude CLI in a Node.js process for IPC acceptable?

**Assumed Answer**: No - adds complexity, extra process overhead, and maintenance burden. Prefer simpler solutions.

**Constraint Revealed**: Minimize architectural changes; prefer in-place improvements.

---

### Probe 4: Performance vs. Reliability Trade-offs

**Original Request**: (implicit - improving communication)

**Variant 1**: Is a 10-20% slower IPC mechanism acceptable if more reliable?

**Assumed Answer**: Yes - task execution time (10s - 5min) dominates IPC overhead (milliseconds). Reliability is paramount.

**Constraint Revealed**: Optimize for reliability first, performance second.

---

**Variant 2**: Is synchronous (blocking) subprocess execution acceptable?

**Assumed Answer**: Yes - TUI already executes tasks sequentially. No need for concurrent execution.

**Constraint Revealed**: Can use simpler synchronous patterns if needed.

---

### Probe 5: Scope of Fix

**Original Request**: "fix the tui package"

**Variant 1**: Should we also refactor the orchestrator, prompt builder, and store?

**Assumed Answer**: No - fix should be scoped to IPC mechanism. Don't rewrite unrelated components.

**Constraint Revealed**: Minimize scope to claudeRunner.ts and related IPC code.

---

**Variant 2**: Should we add monitoring/telemetry for IPC health?

**Assumed Answer**: Nice to have, but not core to fix. Focus on making IPC reliable first.

**Constraint Revealed**: Primary goal is reliability, secondary is observability.

---

## Preference Consistency

Checked against `.preferences.json`: Not found in repository.

Checked against codebase patterns:

### Pattern: Test-Driven Development (TDD)

**From CLAUDE.md:**
> "Tests are the source of truth. This workflow mandates a test-first approach."

**Applied to This Story:**
- ✓ Must write E2E tests for IPC failure scenarios BEFORE fixing
- ✓ Tests should verify: prompt delivery, output streaming, error handling
- ✓ Tests must fail first, then pass after implementation

---

### Pattern: Fresh Context Per Task (Ralph Wiggum)

**From loop.sh and TUI architecture:**
> "Fresh context window (avoid pollution)"

**Applied to This Story:**
- ✓ Solution must maintain pattern of spawning fresh Claude process per task
- ✓ No persistent Claude process or REPL-style interaction
- ✓ Each task execution is independent

---

### Pattern: Minimal Dependencies

**From package.json:**
- TUI uses minimal, well-established libraries
- Avoids heavyweight frameworks

**Applied to This Story:**
- ✓ Prefer using existing dependencies (execa, Node.js built-ins)
- ✓ Avoid adding new dependencies unless necessary
- ✓ If new dependency needed, justify in design doc

---

### Pattern: Cross-Platform Support

**From README and package.json:**
- Node.js 20+ (cross-platform)
- No OS-specific dependencies

**Applied to This Story:**
- ✓ Solution must work on macOS, Linux, Windows (WSL minimum)
- ✓ Test on multiple platforms before completion

---

## Summary

**High Confidence Assumptions (≥80%):**
1. Temp file + shell piping is root cause
2. `-p` flag is more reliable than stdin
3. Claude CLI is mandatory (no API switch)
4. Prompt sizes can be very large
5. Real-time streaming is required
6. Alternative IPC not feasible without CLI changes
7. File watching doesn't interfere
8. Exit codes are reliable

**Medium Confidence Assumptions (65-79%):**
1. Failures are intermittent
2. Cross-platform support required
3. Temp file cleanup issues exist
4. Error messages insufficient

**Key Verification Needed:**
1. Exact failure symptoms (hangs, crashes, wrong output?)
2. Frequency of failures (always, sometimes, rarely?)
3. Error logs or messages when it fails
4. Prompt size in typical usage
5. Does loop.sh have same issues?
6. Platform requirements (macOS/Linux/Windows?)

**Counterfactual Insights:**
- Sockets/HTTP ruled out (too complex, no Claude CLI support)
- Must use Claude CLI as-is (no wrappers or protocol changes)
- Fix should be scoped to IPC layer (don't rewrite orchestrator)
- Reliability >> Performance

**Alignment with Codebase Patterns:**
- ✓ TDD approach required
- ✓ Fresh context pattern maintained
- ✓ Minimal dependencies preferred
- ✓ Cross-platform compatibility expected
