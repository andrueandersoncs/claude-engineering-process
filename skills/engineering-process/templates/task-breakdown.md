# Tasks: [Feature Name]

> Replace bracketed placeholders with actual content.

## Overview

**Design Document:** [Link to design doc, e.g., `docs/design-feature.md`]
**Total Tasks:** [Number]
**Estimated Effort:** [If applicable]

## Task Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Complete
- `[!]` - Blocked

## Task List

### Phase 1: Setup / Foundation

#### Task 1.1: [Title]

**Description:** [What needs to be done]

**Files:**
- `path/to/file.ts` - [What changes]

**Completion Criteria:**
- [ ] [Specific criterion]
- [ ] [Specific criterion]

**Tests:**
- [ ] [Test to write]

**Notes:** [Any additional context]

---

#### Task 1.2: [Title]

**Description:** [What needs to be done]

**Dependencies:** Task 1.1

**Files:**
- `path/to/file.ts`

**Completion Criteria:**
- [ ] [Specific criterion]

**Tests:**
- [ ] [Test to write]

---

### Phase 2: Core Implementation

#### Task 2.1: [Title]

**Description:** [What needs to be done]

**Dependencies:** Task 1.2

**Files:**
- `path/to/file.ts`
- `path/to/other.ts`

**Completion Criteria:**
- [ ] [Specific criterion]
- [ ] [Specific criterion]

**Tests:**
- [ ] [Test to write]
- [ ] [Test to write]

---

#### Task 2.2: [Title]

**Description:** [What needs to be done]

**Dependencies:** None (can parallel with 2.1)

**Files:**
- `path/to/file.ts`

**Completion Criteria:**
- [ ] [Specific criterion]

**Tests:**
- [ ] [Test to write]

---

### Phase 3: Integration

#### Task 3.1: [Title]

**Description:** [What needs to be done]

**Dependencies:** Tasks 2.1, 2.2

**Files:**
- `path/to/file.ts`

**Completion Criteria:**
- [ ] [Specific criterion]

**Tests:**
- [ ] [Integration test]

---

### Phase 4: Polish / Cleanup

#### Task 4.1: [Title]

**Description:** [What needs to be done]

**Dependencies:** Task 3.1

**Files:**
- Various

**Completion Criteria:**
- [ ] [Specific criterion]

---

## Dependency Graph

```
Phase 1:  1.1 ──▶ 1.2
                   │
Phase 2:           ├──▶ 2.1 ──┐
                   │          │
                   └──▶ 2.2 ──┼──▶ 3.1 ──▶ 4.1
                              │
Phase 3:           ───────────┘

Legend: ──▶ depends on
```

## Temporal Logic Constraints (REQUIRED)

Document ordering, concurrency, and timing constraints:

### Sequence Constraints (A must happen before B)

| Constraint | Type | Rationale |
|------------|------|-----------|
| Auth middleware MUST be deployed before protected routes | Deploy order | Routes depend on auth |
| Database migration MUST complete before API deployment | Deploy order | API needs schema |
| [Constraint] | [Type] | [Why] |

### Mutual Exclusion (A and B cannot run simultaneously)

| Resource/Operation A | Resource/Operation B | Conflict Type |
|---------------------|---------------------|---------------|
| Session creation | Token refresh | Race condition |
| Write to user table | Concurrent user update | Data integrity |
| [Operation A] | [Operation B] | [Conflict type] |

### Liveness Requirements (Must eventually happen)

| Requirement | Trigger | Timeout/Guarantee |
|-------------|---------|-------------------|
| User MUST eventually see confirmation | After purchase | 30 seconds |
| Webhook MUST eventually fire | After state change | 5 retries |
| [Requirement] | [Trigger] | [Guarantee] |

### Atomicity Requirements (All-or-nothing)

| Operation Group | Rollback Strategy | Notes |
|-----------------|-------------------|-------|
| Payment + Order creation | Refund payment if order fails | Saga pattern |
| If payment fails, cart MUST NOT be cleared | No action needed | Preserve state |
| [Operation] | [Rollback] | [Notes] |

### Deadlock Analysis

- [ ] Verified: No circular dependencies in task graph
- [ ] Verified: No resource locks that can block each other
- [ ] Verified: No API calls that wait on each other

Potential deadlocks identified:
1. [None / Description of any found]

## Progress Tracking

| Phase | Tasks | Complete | Status |
|-------|-------|----------|--------|
| 1. Setup | 2 | 0 | Not started |
| 2. Core | 2 | 0 | Not started |
| 3. Integration | 1 | 0 | Not started |
| 4. Polish | 1 | 0 | Not started |
| **Total** | **6** | **0** | **0%** |

## Blockers

| Task | Blocker | Resolution | Status |
|------|---------|------------|--------|
| [Task ID] | [What's blocking] | [How to resolve] | [Open/Resolved] |

## Notes

### Implementation Order

1. Start with Task 1.1 (foundation)
2. Task 1.2 depends on 1.1
3. Tasks 2.1 and 2.2 can be done in parallel
4. Task 3.1 requires both 2.1 and 2.2
5. Task 4.1 is final cleanup

### Things to Watch For

- [Potential gotcha]
- [Thing to remember]

### Deviations from Design

[Document any changes from the design discovered during implementation]

| Task | Deviation | Reason |
|------|-----------|--------|
| [ID] | [What changed] | [Why] |
