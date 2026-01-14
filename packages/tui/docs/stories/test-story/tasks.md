# Tasks: Task Timer Warning Indicator

## Overview
Design: [design.md](./design.md)
Estimated tasks: 4
Approach: TDD (write failing tests first, then implement)

## Task List

### Phase 0: Write Failing Tests (MUST BE FIRST)

- [ ] **Task 0.1**: Write component tests for warning indicator
  - Files: `tests/components/StatusBar.test.tsx`
  - Criteria: Tests exist and FAIL (feature not implemented yet)
  - Tests to write:
    - "does not show warning when below threshold"
    - "shows warning when at threshold"
    - "shows warning when above threshold"
    - "warning and PAUSED indicator can coexist"
    - "respects custom threshold prop"
  - **Run tests to confirm they fail before proceeding**

### Phase 1: Foundation

- [ ] **Task 1.1**: Add warning threshold constant
  - Files: `src/utils/constants.ts`
  - Criteria: `TASK_DURATION_WARNING_THRESHOLD_SECONDS` constant exported with value 300
  - Tests: Constant can be imported (basic verification)
  - Note: This is foundation for Task 1.2

### Phase 2: Core Implementation

- [ ] **Task 2.1**: Add warning indicator to StatusBar
  - Files: `src/components/StatusBar.tsx`
  - Changes:
    1. Add optional `warningThresholdSeconds?: number` prop
    2. Import threshold constant
    3. Add conditional rendering of warning indicator (red "⚠ SLOW" text)
    4. Place after PAUSED indicator, before timer
  - Criteria: Warning appears when `elapsedSeconds >= threshold`
  - Tests: All tests from Task 0.1 should now PASS
  - Depends on: Task 0.1, Task 1.1

### Phase 3: Verification

- [ ] **Task 3.1**: Verify all tests pass and existing tests unaffected
  - Run: `npm test`
  - Criteria:
    - All new warning indicator tests pass (GREEN)
    - All existing StatusBar tests pass (no regressions)
    - No TypeScript errors
  - Depends on: Task 2.1

## Dependencies Graph

```
0.1 (tests) ─────────────────┐
                             ↓
1.1 (constant) ───→ 2.1 (implement) ───→ 3.1 (verify)
```

## Notes

- Follow existing PAUSED indicator pattern at `StatusBar.tsx:105-109`
- Use `<Text color="red" bold>` for warning indicator
- Warning text: `{' '}⚠ SLOW{' '}` (with spaces for padding like PAUSED)
- Default threshold: 300 seconds (5 minutes)
- Test with `elapsedSeconds` values: 0, 299, 300, 301, 600
