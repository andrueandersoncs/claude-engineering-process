# Research Notes: Task Timer Warning Indicator

## Relevant Code Locations

### StatusBar Component
- `src/components/StatusBar.tsx:85-122` - Main StatusBar component
- `src/components/StatusBar.tsx:21-30` - StatusBar props interface
- `src/components/StatusBar.tsx:105-109` - Existing PAUSED indicator pattern

### Timer Infrastructure
- `src/hooks/useTimer.ts:63-96` - useTimer hook implementation
- `src/hooks/useTimer.ts:29-32` - UseTimerResult interface (returns elapsedSeconds)
- `src/utils/formatting.ts:41-52` - formatTimerDisplay utility

### Integration Points
- `src/components/Dashboard.tsx:195-202` - Dashboard passes elapsedSeconds to StatusBar

### Test Infrastructure
- `tests/components/StatusBar.test.tsx:1-181` - Existing StatusBar tests
- Test framework: Vitest with ink-testing-library

## Verified Assumptions

- [x] The `useTimer` hook already tracks task duration - **CONFIRMED** at `src/hooks/useTimer.ts:37-45`
- [x] The `StatusBar` component has access to timer state - **CONFIRMED** via `elapsedSeconds` prop from Dashboard
- [x] Existing visual status indicator infrastructure exists - **CONFIRMED** PAUSED indicator at `StatusBar.tsx:105-109`

## Ontology Check (REQUIRED)

| Entity/Role | Expected | Actual in Codebase | Gap? |
|-------------|----------|-------------------|------|
| StatusBar | Display task status | `src/components/StatusBar.tsx` - displays timer, keyboard hints, PAUSED state | OK |
| useTimer | Track elapsed seconds | `src/hooks/useTimer.ts` - returns `elapsedSeconds` | OK |
| Warning indicator | Visual warning pattern | PAUSED indicator pattern at `StatusBar.tsx:106` uses yellow + bold | OK - can reuse pattern |
| Threshold config | Configurable duration | No existing threshold constant | Gap - need to add |

## Detected Contradictions (REQUIRED)

| Requirement A | Requirement B / Constraint | Tension | Status |
|---------------|---------------------------|---------|--------|
| None detected | - | - | Requirements are consistent |

## Patterns to Follow

### Visual Status Indicators
From `StatusBar.tsx:105-109`:
```tsx
{isPaused && (
  <Text color="yellow" bold>
    {' '}PAUSED{' '}
  </Text>
)}
```

### Color Conventions
- **Cyan**: Primary highlights, keyboard hints
- **Yellow**: Secondary emphasis, status (PAUSED)
- **Green**: Success states, running indicators
- **Red**: Error states
- **Gray**: Disabled/muted states

### Testing Patterns
From `StatusBar.test.tsx`:
```typescript
it('shows PAUSED indicator when paused', () => {
  const { lastFrame } = render(<StatusBar isPaused={true} ... />);
  expect(lastFrame()).toContain('PAUSED');
});
```

## Test Infrastructure (REQUIRED)

### Framework & Configuration
- E2E Framework: Playwright (for full E2E tests)
- Unit Framework: Vitest ^1.6.0
- Component Testing: ink-testing-library ^4.0.0
- Config files: `vitest.config.ts`

### Running Tests
```bash
# Unit/component tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Existing Test Patterns
- Test file location: `tests/components/*.test.tsx`
- Test structure: `describe`/`it` blocks with `render()` and `lastFrame()`
- Assertions: `expect(output).toContain()` for text verification

## Dependencies & Constraints

- **Ink framework**: React-based terminal UI - use `<Text>` with `color` and `bold` props
- **No theme system**: Colors are hardcoded strings, not centralized constants
- **StatusBar width**: Uses `<Box flexGrow={1}>` - space shared between left (hints) and right (timer) sections

## Recommendations for Design

1. **Add threshold constant** to `src/utils/constants.ts`:
   - `TASK_DURATION_WARNING_THRESHOLD_SECONDS = 300` (5 minutes)

2. **Follow PAUSED indicator pattern** for warning:
   - Use red or orange color (distinct from yellow PAUSED)
   - Bold text for visibility
   - Place near timer display on right side

3. **Consider prop for custom threshold**:
   - `warningThresholdSeconds?: number` prop on StatusBar
   - Default to constant if not provided

4. **Test coverage needed**:
   - Warning appears when `elapsedSeconds >= threshold`
   - Warning absent when below threshold
   - Warning works regardless of paused state
