# Scope: Task Timer Warning Indicator

## Scope Classification: GREEN (Auto-approved)

This scope is **strictly additive** and follows existing patterns:
- Adds new visual indicator using existing PAUSED indicator pattern
- Adds new constant - no modification of existing constants
- Adds new prop with default value - backward compatible
- All changes enhance without modifying existing behavior

## In Scope

- [x] Add `TASK_DURATION_WARNING_THRESHOLD_SECONDS` constant (300 seconds / 5 minutes)
- [x] Add optional `warningThresholdSeconds` prop to StatusBar
- [x] Add warning indicator display when `elapsedSeconds >= threshold`
- [x] Use red color for warning (distinct from yellow PAUSED)
- [x] Display warning symbol (⚠) with "SLOW" text
- [x] Unit tests for warning threshold logic
- [x] Component tests for StatusBar warning display

## Out of Scope

- **Configurable threshold via settings UI** - Future enhancement, not needed for MVP
- **Multiple warning levels** (warning, critical) - Over-engineering for initial implementation
- **Notification sound/system alert** - Different feature entirely
- **Task history/analytics** - Separate feature
- **Refactoring existing StatusBar** - Keep changes minimal

## Minimal Viable Implementation

The smallest useful increment:
1. Add threshold constant
2. Add conditional warning indicator in StatusBar
3. Add tests to verify behavior

This delivers 100% of the requested value with minimal code changes.

## Dependencies

| Dependency | Status |
|------------|--------|
| `useTimer` hook returning `elapsedSeconds` | ✅ Exists |
| StatusBar receiving `elapsedSeconds` prop | ✅ Exists |
| Ink `<Text>` component with color props | ✅ Exists |
| Vitest + ink-testing-library | ✅ Exists |

No blocking dependencies.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Warning clutters UI | Low | Low | Keep text minimal ("⚠ SLOW") |
| Color conflicts in some terminals | Low | Low | Use standard ANSI colors (red) |

## Test Scope (REQUIRED)

| Test Type | Required | File/Location | Status |
|-----------|----------|---------------|--------|
| Unit: Warning appears at threshold | Yes | tests/components/StatusBar.test.tsx | Pending |
| Unit: No warning below threshold | Yes | tests/components/StatusBar.test.tsx | Pending |
| Unit: Warning works when paused | Yes | tests/components/StatusBar.test.tsx | Pending |
| Unit: Custom threshold prop works | Yes | tests/components/StatusBar.test.tsx | Pending |

Note: E2E tests are typically for user flows through the full application. Since this is a visual indicator change within a single component, comprehensive component tests provide adequate coverage.

## Definition of Done

This task is complete when:
- [ ] Warning indicator appears when task runs ≥ 5 minutes
- [ ] Warning is visually distinct (red color, ⚠ symbol)
- [ ] Default threshold is 5 minutes (300 seconds)
- [ ] All component tests pass
- [ ] Existing StatusBar tests still pass
