# Phase 5: Decompose

## Purpose
Break the design into implementable chunks. Create a task list that can be executed incrementally.

**CRITICAL: Every task MUST reference its required tests. The first task for any feature should be "Write failing E2E test."**

## Agent
**Can delegate to: `architect`** (for complex decomposition)

Often handled in main conversation for simpler tasks.

## Activities

### 1. Identify Implementation Units
Break the design into discrete pieces:
- Each piece should be completable in a few hours
- Each piece should be testable in isolation
- Each piece should be independently deployable (if possible)

### 2. Determine Task Order
Sequence tasks appropriately:
- Foundation before features
- Data layer before API before UI
- Identify parallel vs. sequential work

### 3. Define Task Boundaries (CRITICAL: Include Tests)
For each task, specify:
- What files will be touched
- What the completion criteria are
- **What tests verify completion (REQUIRED)**
- **Whether this task includes writing tests or implementation**

### 4. Identify Dependencies
Map task relationships:
- Which tasks block others?
- Which can be done in parallel?
- Are there external dependencies?

### 5. Vertical Slicing
Prefer thin, complete slices:
- Each slice delivers working functionality
- Avoids "all backend, then all frontend" approaches
- Enables incremental value delivery

## Output

Create `tasks.md` in the story directory (`<project>/docs/stories/<story-slug>/tasks.md`) using [task template](../templates/task-breakdown.md):

```markdown
# Tasks: [Feature Name]

## Overview
Design: [Link to design document]
Estimated tasks: [count]

## Task List

### Phase 0: Write Failing E2E Tests (MUST BE FIRST)
- [ ] **Task 0.1**: Write E2E test for [main user flow]
  - Files: `tests/e2e/feature.spec.ts`
  - Criteria: Test exists and FAILS (feature not implemented yet)
  - Verifies: [acceptance criterion]
  - **Run test to confirm it fails before proceeding**

- [ ] **Task 0.2**: Write E2E test for [error scenarios]
  - Files: `tests/e2e/feature.spec.ts`
  - Criteria: Test exists and FAILS
  - Verifies: [acceptance criterion]

### Phase 1: Foundation
- [ ] **Task 1.1**: [Title]
  - Files: `path/to/file.ts`
  - Criteria: [What makes this done]
  - Tests: Task 0.1 should now pass
  - Unit tests: [specific unit test if needed]

- [ ] **Task 1.2**: [Title]
  - Files: `path/to/file.ts`
  - Criteria: [What makes this done]
  - Tests: [What tests verify this]
  - Depends on: Task 1.1

### Phase 2: Core Implementation
- [ ] **Task 2.1**: [Title]
  - Files: `path/to/file.ts`, `path/to/other.ts`
  - Criteria: [What makes this done]
  - Tests: [What tests verify this - must reference E2E test]
  - Depends on: Task 1.2

### Phase 3: Integration & Verification
- [ ] **Task 3.1**: Verify all E2E tests pass
  - Criteria: All E2E tests from Phase 0 are GREEN
  - Run: `npx playwright test feature.spec.ts`

## Dependencies Graph
```
1.1 → 1.2 → 2.1
           ↘
             → 3.1
2.2 ────────→
```

## Notes
- [Any implementation notes]
- [Gotchas or things to watch for]
```

## Task Sizing Guidelines

**CRITICAL: Tasks are executed via the autonomous loop, which spawns a FRESH context for each task.** Size tasks so they can be completed in a single fresh context window.

### Context-Aware Sizing (Loop Mode)

Each task runs in isolation with fresh context. Tasks should be sized to:
- **Complete in a SINGLE fresh context window** (~176K usable tokens)
- **Touch no more than 5-10 files** (keeps context focused)
- **Make one logical, testable change** (single responsibility)
- **Be describable in ~500-1000 tokens** (fits in loop prompt)

### Too Big (Split It)
Signs a task needs splitting:
- More than 4 hours of work
- Touches many unrelated areas (>10 files)
- Multiple independent pieces of logic
- Can't describe completion in one sentence
- Would benefit from "continuing where you left off"
- Requires reading extensive codebase to understand

### Too Small (Combine It)
Signs tasks should be combined:
- Less than 15 minutes of work
- Just configuration or naming
- No meaningful test possible
- Creates unnecessary context switching
- Trivial change that doesn't warrant fresh context

### Just Right (Loop-Friendly)
Good task characteristics:
- 1-4 hours of focused work
- Clear start and end point
- Verifiable completion criteria
- Fits in a single commit
- **Can be explained to a fresh context in <1000 tokens**
- **Touches a focused set of related files**
- **Has a clear test that verifies completion**

### Example Task Sizing

**Too Big** (split this):
```
- [ ] Implement user authentication system
  - Files: 15+ files across auth, api, db, ui
  - Problem: Too broad, needs multiple contexts
```

**Just Right** (loop-friendly):
```
- [ ] **Task 1.1**: Add User model with password hashing
  - Files: `src/models/user.ts`, `src/models/index.ts`
  - Criteria: User model exists with bcrypt password hashing
  - Tests: Unit test verifies password hashing works

- [ ] **Task 1.2**: Add login API endpoint
  - Files: `src/api/auth.ts`, `src/api/routes.ts`
  - Criteria: POST /login validates credentials and returns token
  - Tests: E2E test from Task 0.1 should pass login flow
  - Depends on: Task 1.1
```

## Completion Criteria

- [ ] All design elements have corresponding tasks
- [ ] Tasks are small enough to complete in a few hours
- [ ] Tasks have clear completion criteria
- [ ] Dependencies are identified
- [ ] Task order is logical
- [ ] Task breakdown document is saved as artifact
- [ ] **CRITICAL: First task(s) are "Write failing E2E test"**
- [ ] **CRITICAL: Every implementation task references which test(s) it satisfies**
- [ ] **CRITICAL: Final task verifies all E2E tests pass**

## Common Pitfalls

1. **Horizontal Slicing** - All of one layer before the next
2. **Monolithic Tasks** - Tasks too large for a single loop iteration
3. **Missing Tests** - Not including test writing in tasks
4. **Unclear Criteria** - Vague definition of "done"
5. **Tests After Implementation** - Writing tests last instead of first (VIOLATES TDD)
6. **No Test References** - Tasks without clear connection to tests
7. **Context-Heavy Tasks** - Tasks that require understanding too much code to complete in fresh context
8. **Multi-Concern Tasks** - Tasks that do "A and B and C" instead of focused single changes

## Next Phase
Proceed to [Phase 6: Implement](6-implement.md) when criteria are met.
