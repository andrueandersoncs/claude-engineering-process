# Design: Task Timer Warning Indicator

## Overview

Add a visual warning indicator to the StatusBar that alerts users when a task has been running longer than expected. This helps identify potentially stuck tasks early.

## Requirements

### Functional
- Display warning indicator when `elapsedSeconds >= warningThreshold`
- Default threshold: 300 seconds (5 minutes)
- Warning displays: red "⚠ SLOW" text
- Warning appears alongside existing elements (doesn't replace timer or PAUSED)

### Non-Functional
- Performance: Negligible - single conditional check per render
- Accessibility: Uses semantic warning symbol (⚠) and color

## Architecture

### Component Changes

```
StatusBar (existing)
├── Left section: keyboard hints (unchanged)
└── Right section:
    ├── PAUSED indicator (existing)
    ├── Warning indicator (NEW)
    └── Timer display (existing)
```

### Data Flow

```
Dashboard
  └── passes elapsedSeconds (existing)
  └── passes warningThresholdSeconds (NEW, optional)
      ↓
StatusBar
  └── checks: elapsedSeconds >= (warningThresholdSeconds ?? DEFAULT_THRESHOLD)
  └── renders: warning indicator if true
```

## Interface Changes

### StatusBar Props (Enhanced)

```typescript
interface StatusBarProps {
  isRunning: boolean;
  isPaused: boolean;
  currentTaskId: string | null;
  elapsedSeconds: number;
  warningThresholdSeconds?: number;  // NEW - default: 300
}
```

### New Constants

```typescript
// src/utils/constants.ts
export const TASK_DURATION_WARNING_THRESHOLD_SECONDS = 300; // 5 minutes
```

## Key Decisions

### Decision 1: Warning Color
**Context**: Need visually distinct color from PAUSED (yellow)
**Options**:
1. Red - Standard warning/error color, high visibility
2. Orange - Less severe than red
3. Magenta - Unique but non-standard for warnings
**Selected**: Red
**Rationale**: Red is universally recognized for warnings; distinct from yellow PAUSED

### Decision 2: Warning Text
**Context**: Need concise indicator that doesn't clutter status bar
**Options**:
1. "⚠ SLOW" - Concise, uses standard warning symbol
2. "⚠ THRESHOLD EXCEEDED" - Verbose, takes space
3. "⚠ LONG-RUNNING" - Moderate length
**Selected**: "⚠ SLOW"
**Rationale**: Most concise while still communicating the issue

### Decision 3: Prop vs. Environment Configuration
**Context**: How to configure threshold
**Options**:
1. Prop on StatusBar - Simple, explicit
2. Environment variable - Hidden configuration
3. Context/store - Over-engineering
**Selected**: Prop with default value
**Rationale**: Simplest approach; constant provides sensible default

## Design Simulation

### Step 1: Task starts running
- Timer begins counting ✓ (existing useTimer hook)
- elapsedSeconds increments each second ✓

### Step 2: Task reaches 4:59 (299 seconds)
- Check: 299 >= 300? → false
- No warning displayed ✓

### Step 3: Task reaches 5:00 (300 seconds)
- Check: 300 >= 300? → true
- Warning indicator renders ✓
- Red "⚠ SLOW" appears ✓

### Step 4: User pauses task at 6:00
- isPaused = true
- Both PAUSED and warning indicator visible ✓
- (Warning remains because task still exceeded threshold)

### Step 5: Task completes
- currentTaskId becomes null
- Timer section doesn't render (existing behavior)
- Warning also doesn't render (part of timer section) ✓

**Simulation Result**: All flows complete without issues.

## Test Architecture

### Component Tests

| Test Scenario | Location | Dependencies |
|---------------|----------|--------------|
| No warning below threshold | tests/components/StatusBar.test.tsx | None |
| Warning at threshold | tests/components/StatusBar.test.tsx | None |
| Warning with custom threshold | tests/components/StatusBar.test.tsx | None |
| Warning + PAUSED coexist | tests/components/StatusBar.test.tsx | None |

### Test Data Setup
- Use fixed `elapsedSeconds` values (299, 300, 301)
- No external fixtures needed
- No mocks required (pure component logic)

### Test File Structure
```
tests/components/
└── StatusBar.test.tsx   # Add new describe block for warning tests
```

## Implementation Notes

1. Add constant first - other changes depend on it
2. Add prop to interface with default value for backward compatibility
3. Add conditional rendering after PAUSED indicator
4. Write tests alongside implementation (TDD)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Warning overlaps other elements | Low | Low | Test with long task IDs |
| Color not visible in some terminals | Low | Low | ⚠ symbol provides fallback |
