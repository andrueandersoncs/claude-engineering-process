# User Story: Fix TUI Story Creation Dashboard Display

## Story

> As a TUI user,
> I want to see the Dashboard view immediately after creating a new story via the 'Create Story' feature,
> So that I can begin working on the story without confusion or manual intervention.

## Background

The TUI package (`packages/tui/`) provides an inline story creation feature that allows users to press 'n' in the StoryPicker, enter a story title, and have the system create the necessary directory structure and initialize the story. This feature was recently implemented in the `tui-inline-story-creation` story (currently in deploy phase).

### Current Behavior

When a user creates a story through the TUI:
1. Presses 'n' in StoryPicker
2. Sees the StoryCreator text input
3. Types a story title
4. Presses Enter to submit
5. **BUG**: User reports "nothing happens" - the expected Dashboard view does not appear
6. The story IS created (user reports "it goes to step 1"), but the UI doesn't transition

### Expected Behavior

After submitting a story title:
1. The `createStory()` action should:
   - Create `docs/stories/<slug>/` directory
   - Write `workflow-state.json` with `currentPhase: 'understand'`
   - Refresh the story list
   - Load the new story into state
2. The App component should:
   - Transition `view` from 'picker' to 'dashboard'
   - Set `currentStory` to the newly created story object
3. The Dashboard should render showing:
   - Story title in header
   - Phase indicator showing "1/8 (Understand)"
   - Empty task list (0/0 tasks - no tasks.md exists yet)
   - Output panel with "No output yet. Press Enter to start the workflow."
   - Status bar with keyboard hints

### Technical Context

From codebase research:
- **Store action**: `createStory()` in `src/store/index.ts` (lines 172-203)
- **View transition**: App.tsx manages view state and renders Dashboard when `currentStory` is non-null
- **Dashboard**: Requires non-null `currentStory` prop from Zustand store
- **File creation**: Uses Node.js `fs` sync methods (`mkdirSync`, `writeFileSync`)

### Hypothesis

The most likely issue is that the view state or currentStory state is not properly updating after `createStory()` completes, preventing the Dashboard from rendering. Possible causes:
1. `loadStory()` fails silently after story creation
2. `view` state doesn't transition to 'dashboard'
3. State update doesn't trigger React re-render
4. Race condition between file creation and state loading

## Acceptance Criteria

### Must Have

- [ ] **AC1: Dashboard Appears After Creation**
  - **Given** I am in the StoryPicker view with no story selected
  - **When** I press 'n', enter a valid story title (e.g., "Test Feature"), and press Enter
  - **Then** the Dashboard view appears within 500ms showing the newly created story

- [ ] **AC2: Story Metadata Displayed**
  - **Given** the Dashboard has appeared after story creation
  - **When** I view the header and phase indicator
  - **Then** I see:
    - Story title matching what I entered
    - Phase indicator showing "1/8" or "Phase 1 (Understand)"
    - Empty task list showing "0/0 tasks" or "No tasks yet"

- [ ] **AC3: Output Panel Shows Initial State**
  - **Given** the Dashboard has appeared after story creation
  - **When** I look at the output panel
  - **Then** I see a message indicating no workflow has started yet (e.g., "No output yet. Press Enter to start the workflow.")

- [ ] **AC4: Story Files Created on Disk**
  - **Given** I have created a story with title "My New Feature"
  - **When** I check the filesystem
  - **Then** I find:
    - Directory exists at `docs/stories/my-new-feature/` (or with uniqueness suffix)
    - File `workflow-state.json` exists with `currentPhase: "understand"`
    - File contains correct title and slug

- [ ] **AC5: Story Available in Picker After Cancel**
  - **Given** I have created a story successfully and the Dashboard is showing
  - **When** I press 's' to return to the StoryPicker
  - **Then** the newly created story appears in the story list

### Should Have

- [ ] **AC6: Loading Indicator During Creation**
  - **Given** I have submitted a story title
  - **When** the creation process is in progress
  - **Then** I see a loading indicator or message (e.g., "Creating story...")

- [ ] **AC7: Error Display on Failure**
  - **Given** the story creation fails (e.g., filesystem permission error)
  - **When** the error occurs
  - **Then** I see an error message explaining what went wrong
  - **And** I remain in the StoryCreator or StoryPicker with the ability to retry

### Nice to Have

- [ ] **AC8: Undo/Quick Return to Picker**
  - **Given** I created a story but immediately realize I don't need it
  - **When** I press Escape or 's' within 3 seconds of creation
  - **Then** I return to the StoryPicker quickly

## Edge Cases

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Duplicate title submitted | Story created with `-2` suffix, Dashboard shows the new slug | Must Handle |
| Very long story title (100+ chars) | Title truncated in UI but full title stored in workflow-state.json | Must Handle |
| Story with special characters (e.g., "Fix Bug #123!") | Slug is sanitized (e.g., "fix-bug-123"), Dashboard shows original title | Must Handle |
| Filesystem permission denied | Error message shown, user stays in StoryCreator to retry | Must Handle |
| Empty input (just spaces) | Error message shown, input cleared, user stays in StoryCreator | Must Handle (already implemented) |
| Extremely small terminal (< 80x24) | Dashboard renders but may have layout issues; minimum viable display | Should Handle |
| Terminal resize during creation | Dashboard adjusts to new size when rendered | Should Handle |
| Multiple rapid creations (stress test) | Each story creates successfully with unique slugs | Nice to Have |

## Out of Scope

The following are explicitly NOT part of this bug fix:
- Enhancing the StoryCreator component with auto-complete or templates
- Modifying the story creation workflow to prompt for additional metadata (e.g., issue URL)
- Improving the slugification algorithm
- Adding "recent stories" or "favorites" features
- Implementing story deletion from the TUI
- Adding undo/redo for story creation
- Improving performance of story list refresh (unless it's the root cause)

## Technical Notes

### Investigation Steps

1. Add debug logging to `createStory()` to verify it completes successfully
2. Add debug logging to `loadStory()` to verify it's called and succeeds
3. Check if `view` state transitions from 'picker' to 'dashboard'
4. Verify `currentStory` is set in Zustand store after creation
5. Test if Dashboard renders correctly when `currentStory` is manually set
6. Check for React rendering errors or suspense boundaries
7. Verify Ink's `render()` is triggering re-renders on state changes

### Relevant Files

- `packages/tui/src/store/index.ts` - `createStory()` action (lines 172-203)
- `packages/tui/src/components/App.tsx` - View orchestration and state management
- `packages/tui/src/components/Dashboard.tsx` - Dashboard component that should appear
- `packages/tui/src/components/StoryPicker.tsx` - StoryPicker that should disappear
- `packages/tui/src/components/StoryCreator.tsx` - Input component (likely working)

### Testing Strategy

**Before Fix**:
1. Reproduce bug locally by running `npm run build && ep-tui` in packages/tui
2. Press 'n', enter a title, confirm Dashboard doesn't appear
3. Check if story files exist on disk
4. Add console.log statements to trace execution

**After Fix**:
1. Run existing unit tests: `npm test`
2. Run E2E tests: `npm run test:e2e`
3. Manual test: Create story, verify Dashboard appears
4. Manual test: Check all acceptance criteria
5. Add specific test case for this bug if not covered

### Dependencies

- **Ink v5**: React rendering for terminals
- **Zustand v4**: State management (async actions, state transitions)
- **Node.js fs**: Filesystem operations (synchronous)
- **chokidar**: File watching (may interfere with creation flow)

### Potential Root Causes (Prioritized)

1. **State not updating**: `loadStory()` sets state but doesn't trigger re-render
2. **View not transitioning**: `setView('dashboard')` not called or not working
3. **Async timing issue**: `loadStory()` called before files fully written
4. **File watcher interference**: chokidar sees new files and overrides state
5. **React error boundary**: Dashboard throws error during render
6. **Zustand state mutation**: State updated incorrectly (e.g., mutating instead of replacing)

## Assumptions Made

| # | Assumption | Confidence | Risk if Wrong |
|---|------------|------------|---------------|
| 1 | User successfully submitted story title (input phase works) | High | Low - would discover during reproduction |
| 2 | Story files are created on disk | High | Medium - different bug category (filesystem) |
| 3 | Dashboard renders but appears empty or incomplete | Medium | High - affects debugging approach |
| 4 | Bug is deterministic (happens every time) | High | Medium - intermittent bugs are harder to debug |
| 5 | User is running latest code with story creation feature | Medium | Low - easy to verify and fix |
| 6 | Terminal has sufficient size (>=80x24) | High | Low - unlikely root cause |
| 7 | No filesystem permissions issues | High | Medium - would see error messages |
| 8 | Bug is not environment-specific | Medium | Low - Ink is cross-platform |

**Key Assumption to Verify**: The exact symptom - does the user see (a) nothing at all, (b) a partial Dashboard, or (c) the StoryPicker still showing?

## Open Questions

Questions that require user input or testing to answer:

1. **What exactly do you see after pressing Enter?**
   - Does the StoryPicker remain visible?
   - Do you see a blank screen?
   - Is there any text visible at all (header, status bar)?

2. **Can you verify the story was created on disk?**
   - Check if `docs/stories/` contains a new subdirectory
   - If yes, what is the slug (directory name)?
   - Does `workflow-state.json` exist in that directory?

3. **Does manual story loading work?**
   - Try running: `ep-tui --story <slug>` (using the slug from question 2)
   - Does the Dashboard appear correctly?

4. **What is your environment?**
   - Operating system (macOS, Linux, Windows)?
   - Terminal emulator (iTerm2, Terminal.app, etc.)?
   - Node.js version (`node --version`)?
   - Terminal size in characters (columns x rows)?

5. **Can you reproduce the bug consistently?**
   - Does it happen every single time you create a story?
   - Or has it worked successfully before?

6. **Are there any error messages?**
   - Check the terminal for any errors or warnings
   - Are there any console logs visible?

## Verification Summary

**For User to Confirm:**

1. **Symptom Clarification**: After story creation, do you see (a) the StoryPicker still visible, (b) a blank/empty area, or (c) partial Dashboard with missing content?

2. **Filesystem Verification**: Does a new directory appear in `docs/stories/` with a workflow-state.json file?

3. **Reproducibility**: Does this happen every time, or is it intermittent?

4. **Manual Loading**: Does running `ep-tui --story <slug>` (where `<slug>` is the created directory name) show the Dashboard correctly?

5. **Environment**: What OS, terminal, and Node version are you using?

**Generated Acceptance Criteria Overview:**
- 5 Must Have criteria covering Dashboard appearance, content display, and filesystem verification
- 2 Should Have criteria for loading indicators and error handling
- 1 Nice to Have for quick undo functionality
- 8 edge cases identified with handling priorities

**Counterfactual Probes Revealed:**
- Dashboard vs. output panel terminology may be confused
- View transition (picker → dashboard) might not be happening
- Manual story loading (via --story flag) likely works fine
- Issue is specific to inline creation flow, not Dashboard rendering in general

**Misinterpretations That Couldn't Be Ruled Out:**
- "No output" could mean "no Claude process output" vs. "no Dashboard UI" - assumed the latter with high confidence
- "Goes to step 1" could mean user manually navigated, but this contradicts "nothing happens" - very low confidence

## Next Steps

1. **Reproduce the bug** locally by following the exact steps
2. **Add debug logging** to trace `createStory()` → `refreshStories()` → `loadStory()` → `setView()` flow
3. **Identify the breakpoint** where the expected behavior diverges
4. **Implement fix** based on findings
5. **Add regression test** to prevent recurrence
6. **Verify all acceptance criteria** before marking complete
