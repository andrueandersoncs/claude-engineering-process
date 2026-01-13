# Phase 6: Implement

## Purpose
Write tests first, then code that makes them pass. Execute tasks using **iterative execution** with fresh context per task.

**CRITICAL: E2E tests MUST be written and verified to FAIL before any implementation code is written.**

## Execution Model: Two Approaches

Phase 6 supports two execution approaches. Choose based on your workflow:

| Approach | When to Use | Context Behavior |
|----------|-------------|------------------|
| **loop.sh** (Recommended) | Autonomous execution, many tasks, best quality | Fresh CLI process per task |
| **Task tool** | Interactive session, few tasks, need feedback | Subagent in forked context |

### Why Fresh Context Matters (The Wiggum Insight)

> "Fresh context per iteration prevents error accumulation" — The Ralph Playbook

The outer loop (`loop.sh`) spawns a **completely fresh Claude CLI process** for each task. This provides:
- **Zero context pollution** - No accumulated errors or assumptions
- **Maximum "smart zone" utilization** - Each task gets Claude's full attention
- **Consistent quality** - Task 20 gets the same quality as Task 1
- **True isolation** - Failures don't cascade

The Task tool approach runs the implementer as a **subagent in forked context**, which is good for interactive work but the **orchestrator's context still accumulates**.

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOMMENDED: loop.sh for autonomous execution                  │
│  ALTERNATIVE: Task tool for interactive sessions                │
│                                                                 │
│  Fresh context per task = consistent quality throughout        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Option A: Autonomous Loop (RECOMMENDED)

Use `loop.sh` for the best alignment with Wiggum principles. This spawns fresh Claude CLI invocations for each task.

### Running the Loop

```bash
# From your project root (not the plugin directory)
./scripts/loop.sh                    # Uses most recent story
./scripts/loop.sh add-authentication # Uses specific story slug
```

### How It Works

```
┌──────────────────────────────────────────────────────────────┐
│  loop.sh Execution Flow (Fresh Context Per Task)             │
├──────────────────────────────────────────────────────────────┤
│  1. Read tasks.md, find next incomplete task [ ]             │
│  2. Build prompt with embedded context                       │
│  3. Spawn fresh Claude: `claude -p "$prompt"`                │
│  4. Claude executes ONE task (TDD cycle)                     │
│  5. Run validation (tests/lint/typecheck)                    │
│  6. If PASS: mark task [x] complete                          │
│  7. If FAIL: pause for manual intervention                   │
│  8. Loop back to step 1                                      │
└──────────────────────────────────────────────────────────────┘
```

### Configuration

```bash
# Environment variables
MAX_ITERATIONS=50     # Safety limit (default)
SKIP_VALIDATION=0     # Set to 1 to skip tests between tasks
DRY_RUN=0             # Set to 1 to preview without executing
CONTEXT_FILES=""      # Additional files to include (space-separated)
```

### Prerequisites

1. Story must be in the `implement` phase
2. `tasks.md` must exist with task breakdown
3. Claude CLI must be available as `claude` (or set `CLAUDE_BIN`)

---

## Option B: Interactive Task Delegation

Use the Task tool when you need interactive feedback or are working on a small number of tasks.

### Task Delegation

For each incomplete task, delegate using the Task tool:

```
Task tool:
  subagent_type: "implementer"
  prompt: |
    ## Your Task
    Complete Task X.Y: [task title from tasks.md]

    ## Task Details
    [Copy the full task description]

    ## Context Files
    - Design: docs/stories/<slug>/design.md
    - Research: docs/stories/<slug>/research-notes.md
    - Tasks: docs/stories/<slug>/tasks.md

    ## TDD Requirements
    1. Write the failing test FIRST
    2. Run tests to verify failure
    3. Implement minimum code to pass
    4. Run tests to verify success
    5. Mark task [x] complete in tasks.md
```

### Interactive Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. Read tasks.md to find the next incomplete task [ ]       │
│  2. Delegate to implementer agent with task context          │
│  3. Wait for implementer to complete the task                │
│  4. Run validation (tests/lint/typecheck)                    │
│  5. If PASS: verify task marked [x], proceed to step 1       │
│  6. If FAIL: address the failure before continuing           │
│  7. Repeat until all tasks are marked [x] complete           │
└──────────────────────────────────────────────────────────────┘
```

**Note**: With Task tool delegation, the orchestrator context grows with each iteration. For many tasks (5+), prefer `loop.sh`.

## The Test-First Mandate

```
┌─────────────────────────────────────────────────────────────────┐
│ IRON RULE: NO IMPLEMENTATION CODE WITHOUT A FAILING TEST FIRST │
└─────────────────────────────────────────────────────────────────┘
```

### Why Tests First?
1. **Tests define done** - You know exactly what to build
2. **Tests verify they work** - A test that passes immediately hasn't been verified
3. **Tests guide design** - Writing tests first leads to better interfaces
4. **Tests prevent gold-plating** - You only write what's needed to pass

## Pre-Loop Setup

Before starting the loop:

1. **Verify tasks.md exists** with proper structure
2. **Verify first task(s) are "Write failing E2E test"**
3. **Review design.md** to understand the approach
4. **Check test infrastructure** is ready (Playwright, Vitest, etc.)

## Task Execution (Per-Task Behavior)

Each loop iteration spawns a fresh context that:

### 1. Writes E2E Tests FIRST (if task requires)

```typescript
// Example: tests/e2e/user-login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

### 2. Verifies Tests FAIL

```bash
npx playwright test user-login.spec.ts
# Expected output: FAILED (because feature doesn't exist yet)
```

If tests pass immediately, something is wrong:
- Test is not actually testing the new feature
- Test is too vague
- Feature already exists (verify scope)

### 3. Implements to Make Tests Pass

Write the **minimum code** to make the test pass:
1. Read the failing test to understand what's needed
2. Implement only what's required
3. Run the test to verify it passes
4. Commit with clear message

### 4. The Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────┐
│  RED: Write failing test                        │
│       ↓                                         │
│  GREEN: Write minimum code to pass              │
│       ↓                                         │
│  REFACTOR: Clean up while staying green         │
│       ↓                                         │
│  COMMIT: Clear message referencing task         │
└─────────────────────────────────────────────────┘
```

## Validation as Backpressure

After each task, run validation to verify the implementation:

```bash
# Run the project's test/lint/typecheck commands:
npm test        # or yarn test, pnpm test
npm run lint    # if configured
npm run typecheck  # if configured (e.g., tsc --noEmit)
```

**Validation failures block progress.** Do not proceed to the next task until:
- All tests pass
- Linting passes
- Type checking passes

This creates **downstream backpressure** - invalid work is caught before proceeding.

## Implementation Order

Tasks should follow this order (enforced by task dependencies):

```
0. Write E2E tests (MUST BE FIRST)
   ↓ Verify tests FAIL
   ↓
1. Database/Schema changes (if any)
   ↓
2. Data layer / Models
   ↓
3. Business logic / Services + Unit tests
   ↓
4. API endpoints / Controllers
   ↓
5. UI components (if any)
   ↓
6. Integration / Wiring
   ↓
7. Verify all E2E tests PASS
```

## Handling Failures

### Task Execution Failed
```
1. Review the error output from the implementer
2. Identify the root cause
3. Provide feedback and retry the task delegation
4. Or fix the issue manually and mark task complete
```

### Validation Failed
```
1. Tests/lint failed after implementation
2. Do NOT proceed to the next task
3. Fix the failing tests or lint issues
4. Re-run validation until it passes
```

### Design Doesn't Work
```
1. Stop implementation
2. Document the issue in tasks.md or design.md
3. Return to design phase: /engineering-process:phase design
4. Regenerate tasks if design changed significantly
```

### Deeper Issues: Regression Beyond Design

**Plans are disposable.** Sometimes implementation reveals issues that go deeper than design:

| Finding | Regress To | Why |
|---------|------------|-----|
| Test can't be written because **requirement is unclear** | **Phase 1 (Understand)** | Need user clarification |
| Implementation reveals **wrong assumptions** about what user wants | **Phase 1 (Understand)** | Understanding was flawed |
| **Scope explosion** (10x+ what was expected) | **Phase 1 (Understand)** | User must approve expanded scope |
| Design was based on **incorrect research** | **Phase 2 (Research)** | Re-investigate codebase |

**The disciplined response**: When discoveries contradict assumptions, stop and reassess rather than hack around obstacles. One planning loop is cheaper than spiraling.

```markdown
## Example: Implementation Regression

**Task**: Implement user preferences API
**Problem**: Can't write test because we don't know where preferences are stored

**Investigation**: Research notes assumed a `preferences` table exists.
**Reality**: Preferences are in Redis with 24h TTL (discovered at src/cache/user.ts:34)

**Impact**: Original requirement "persistent preferences" can't work with existing system.

**Decision**: Regress to Phase 1 to clarify with user:
- Option A: Accept 24h TTL (minimal change)
- Option B: Add database storage (scope expansion)
```

### Blocked by Dependencies
```
1. Check if task dependencies are properly marked in tasks.md
2. Verify blocking tasks are complete
3. If circular dependency: refactor tasks.md
4. Continue with the corrected task order
```

## Commit Guidelines

### Message Format
```
type: short description

Longer explanation if needed.

- Bullet points for details
- Reference to task: Task X.Y
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding tests
- `refactor`: Code change that doesn't change behavior
- `docs`: Documentation changes
- `chore`: Maintenance tasks

### Frequency
- One commit per task
- Each commit should build/test successfully

## Quality Checklist (Per Task)

Each task completion requires:
- [ ] **E2E test written FIRST and verified to FAIL** (if applicable)
- [ ] **E2E test now PASSES after implementation**
- [ ] Implementation matches design
- [ ] Unit tests cover complex logic
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] No type errors
- [ ] Follows project conventions

## Phase Completion

Phase 6 is complete when:
- All tasks in tasks.md are marked `[x]` complete
- All validation passes (tests, lint, typecheck)

## Output

After implementation is complete:
- **All E2E tests passing**
- All implementation tasks marked `[x]` complete
- All unit tests passing
- Commit history with clear messages per task
- tasks.md fully marked complete

## Completion Criteria

- [ ] **CRITICAL: All tasks complete** (all marked `[x]` in tasks.md)
- [ ] **CRITICAL: All E2E tests pass**
- [ ] **CRITICAL: Tests were written BEFORE implementation**
- [ ] All unit tests pass
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] All commits have clear messages

## Next Phase
Proceed to [Phase 7: Validate](7-validate.md) when all tasks are complete and validation passes.
