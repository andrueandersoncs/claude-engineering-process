# Research Context: TUI Create Story No Output

## Codebase Research Findings

### TUI Package Structure

The TUI package is located at `/packages/tui/` and is built with:
- **Framework**: Ink v5 (React for terminal UIs)
- **State**: Zustand for global state management
- **CLI**: meow for argument parsing
- **Build**: tsup for compilation

### Story Creation Flow (As Implemented)

The inline story creation feature was recently implemented in the story `tui-inline-story-creation` (currently in deploy phase). The flow is:

1. **User presses 'n' in StoryPicker** → `useKeyboard` hook detects it
2. **App.tsx sets `isCreatingStory = true`** → StoryPicker renders StoryCreator component
3. **User types title and presses Enter** → `handleSubmitCreate` validates title
4. **Store.createStory(title)** is called:
   - Generates unique slug via `slugify(title)` and `ensureUniqueSlug()`
   - Creates directory at `docs/stories/<slug>/`
   - Writes initial `workflow-state.json` with:
     - `currentPhase: 'understand'`
     - `completedPhases: []`
     - Story title and slug
   - Calls `refreshStories()` to re-scan directory
   - Calls `loadStory(slug)` to load the new story
5. **loadStory() sets view to 'dashboard'** → App.tsx should render Dashboard component

### Relevant File Locations

| File | Purpose |
|------|---------|
| `packages/tui/src/components/App.tsx` | Root component, orchestrates views |
| `packages/tui/src/components/StoryPicker.tsx` | Lists stories, shows "Create New Story" option |
| `packages/tui/src/components/StoryCreator.tsx` | Text input for story title |
| `packages/tui/src/components/Dashboard.tsx` | Main dashboard view (shown after story loads) |
| `packages/tui/src/store/index.ts` | Zustand store with `createStory` action (lines 172-203) |
| `packages/tui/src/hooks/useKeyboard.ts` | Keyboard event handling |
| `packages/tui/src/index.tsx` | Entry point, calls `render()` from Ink |

### Dashboard Rendering Logic

From `App.tsx` (lines 290-308):
```typescript
// Render dashboard
return (
  <Dashboard
    story={currentStory}
    tasks={tasks}
    output={output}
    isRunning={isRunning}
    isPaused={isPaused}
    activeTaskId={activeTaskId}
    selectedTaskIndex={selectedTaskIndex}
    onSelectTask={(id) => {
      const index = tasks.findIndex((t) => t.id === id);
      if (index >= 0) {
        selectTask(index);
      }
    }}
    elapsedSeconds={elapsedSeconds}
  />
);
```

The Dashboard requires `currentStory` to be non-null. It should display:
- Header with story title and phase
- PhaseProgress component showing current phase
- TaskListPanel (left 30%) showing tasks
- OutputPanel (right 70%) showing Claude subprocess output
- StatusBar at bottom

### What "Step 1" Likely Means

In the engineering process, Phase 1 is "Understand" (see `skills/engineering-process/phases/1-understand.md`). This matches what `createStory()` sets: `currentPhase: 'understand'`.

When a story is created, `workflow-state.json` is created with:
```json
{
  "story": "User-provided title",
  "slug": "generated-slug",
  "source": "direct",
  "currentPhase": "understand",
  "completedPhases": [],
  "startedAt": "2024-01-13T12:00:00.000Z"
}
```

At this point, there are NO tasks (no `tasks.md` file exists yet). The dashboard should show an empty task list.

### Expected vs. Actual Behavior

**Expected**: After creating a story via 'n' key:
1. StoryCreator appears with text input
2. User types title and presses Enter
3. Dashboard appears showing:
   - Story title
   - Phase 1/8 (Understand)
   - Empty task list (0/0 tasks)
   - Output panel saying "No output yet. Press Enter to start the workflow."
   - Status bar with keyboard hints

**Actual** (per bug report):
- Story creation happens (gets to "step 1")
- But "nothing happens" - no output visible

### Potential Root Causes

Based on code inspection, potential causes for "no output":

1. **Dashboard renders but is blank**
   - Missing story data in state after `loadStory()`
   - Rendering error in Dashboard component
   - Terminal viewport too small to show content

2. **Dashboard doesn't render at all**
   - `view` state not transitioning to 'dashboard'
   - `currentStory` is null after `loadStory()`
   - React render cycle not completing

3. **Story creation fails silently**
   - `createStory()` throws error but it's caught
   - Filesystem error (permissions, disk full)
   - Error state set but not displayed

4. **Ink rendering issue**
   - Ink doesn't re-render after state change
   - React suspense boundary or async issue
   - Terminal compatibility problem

5. **File watcher interference**
   - File watcher sees the new files and interferes
   - Race condition between creation and loading

### Testing Patterns

From `tests/e2e/storyCreation.test.ts`, the tests verify:
- "Create New Story" option is shown
- Keyboard hints include `[n]`
- Created story can be loaded with `--story` flag
- Dashboard shows story after manual creation

**Notable**: The E2E tests don't actually test the FULL interactive flow of pressing 'n', typing, and seeing the dashboard. They test individual pieces but not the complete user journey.

### Related Stories

The inline story creation feature was developed in story `tui-inline-story-creation`:
- Design doc: `docs/stories/tui-inline-story-creation/design.md`
- Tasks: `docs/stories/tui-inline-story-creation/tasks.md`
- Current phase: deploy (all implementation complete)

This suggests the feature WAS working but may have regressed, OR there's a gap between what was tested and actual usage.

## User Roles Identified

Based on codebase patterns:

1. **TUI User** - Developer using the ep-tui CLI to manage engineering workflows
2. **Story Creator** - Specific role of initiating new stories within the TUI

## Similar Features/Patterns

1. **Story Loading** - `loadStory(slug)` function in store
2. **Story Picker** - Existing story selection works correctly
3. **Dashboard Display** - Dashboard works when story is pre-loaded via `--story` flag
4. **File Creation** - Other parts of system create files (e.g., hooks setup)

## Domain Terminology

- **TUI**: Terminal User Interface (the Ink-based CLI application)
- **Story**: A unit of work in the engineering process (stored in `docs/stories/`)
- **Phase**: One of 8 stages in the engineering workflow (Understand, Research, Scope, Design, Decompose, Implement, Validate, Deploy)
- **Dashboard**: Main TUI view showing story progress, tasks, and output
- **StoryPicker**: Modal view for selecting or creating stories
- **StoryCreator**: Input component for entering new story title
- **Slug**: URL-safe identifier derived from story title (e.g., "add-user-auth")
- **Headless mode**: Testing mode that renders once and exits (`--headless` flag)

## Testing Patterns

From existing tests:
- Unit tests use `vitest` and `ink-testing-library`
- E2E tests use `execa` to spawn the CLI binary
- Test fixtures create temp directories with mock stories
- Tests check stdout content in headless mode
- Component tests use `render()` and `lastFrame()` from ink-testing-library

## Key Dependencies

- `ink@^5.0.1` - React renderer for terminal
- `zustand@^4.5.0` - State management
- `meow@^13.2.0` - CLI argument parser
- `execa@^8.0.1` - Process execution for tests
- `chokidar@^3.6.0` - File watching
