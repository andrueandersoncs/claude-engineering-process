# Verification Summary: TUI Create Story No Output

## Story Statement

> As a TUI user, I want to see the Dashboard view immediately after creating a new story via the 'Create Story' feature, so that I can begin working on the story without confusion or manual intervention.

## Top 5 Assumptions Needing Validation

### 1. Dashboard Doesn't Appear (vs. Appears But Empty) - **CRITICAL**
**Assumption**: The Dashboard component doesn't render at all, not that it renders with missing content.

**Why it matters**: Determines whether to debug view transitions or component rendering.

**Quick check**: After creating a story, do you see ANY text at all (header, status bar) or is the screen unchanged/blank?

---

### 2. Story Files Created Successfully - **HIGH PRIORITY**
**Assumption**: The filesystem operations succeed and create `docs/stories/<slug>/workflow-state.json`.

**Why it matters**: If files aren't created, this is a filesystem issue, not a rendering issue.

**Quick check**: After the bug occurs, check if `docs/stories/` has a new subdirectory. If yes, does it contain `workflow-state.json`?

---

### 3. Bug is Deterministic - **MEDIUM PRIORITY**
**Assumption**: This happens every single time you create a story, not intermittently.

**Why it matters**: Intermittent bugs suggest race conditions or timing issues; consistent bugs suggest logic errors.

**Quick check**: Have you tried creating multiple stories? Does it fail every time?

---

### 4. Manual Story Loading Works - **HIGH PRIORITY**
**Assumption**: If you run `ep-tui --story <slug>` with a created story's slug, the Dashboard appears correctly.

**Why it matters**: Would prove the Dashboard itself works and the issue is in the creation flow.

**Quick check**: Try `ep-tui --story <slug>` (replace `<slug>` with the directory name from check #2). Does the Dashboard appear?

---

### 5. User Completed Input Phase - **MEDIUM PRIORITY**
**Assumption**: You successfully typed a title and pressed Enter (input phase worked).

**Why it matters**: If the input phase failed, we're debugging the wrong component.

**Quick check**: Did you see the "Story title:" prompt and successfully press Enter?

## Acceptance Criteria Overview

**5 Must Have Criteria:**
1. Dashboard appears within 500ms after story creation
2. Story metadata (title, phase 1/8, task count) displayed correctly
3. Output panel shows "No output yet" initial state
4. Story files created on disk with correct structure
5. Story appears in picker list if user returns

**2 Should Have Criteria:**
6. Loading indicator shown during creation
7. Error messages displayed if creation fails

**1 Nice to Have:**
8. Quick undo/return to picker within 3 seconds

## Edge Cases Identified

**Must Handle:**
- Duplicate titles (create with `-2` suffix)
- Special characters in titles (sanitize slug)
- Filesystem permission errors (show error)
- Empty/whitespace-only input (already implemented)

**Should Handle:**
- Very long titles (truncate in UI)
- Small terminal viewports
- Terminal resize during creation

## Open Questions Requiring User Input

1. **What do you see after pressing Enter?** (StoryPicker still visible? Blank screen? Any text?)
2. **Do story files exist on disk?** (Check `docs/stories/` for new directory)
3. **Does manual loading work?** (Try `ep-tui --story <slug>`)
4. **What is your environment?** (OS, terminal, Node version, terminal size)
5. **Is it reproducible?** (Happens every time? Ever worked before?)
6. **Any error messages?** (Console errors, warnings, or logs visible?)

## Investigation Approach

**If files exist on disk**: Issue is with view transition or state management.
- Debug `loadStory()` and `setView()` calls
- Check if `currentStory` is set in Zustand store
- Verify React re-render triggers

**If files don't exist**: Issue is with `createStory()` execution.
- Debug filesystem operations
- Check permissions
- Look for silently caught errors

**If manual loading works**: Issue is specific to inline creation flow.
- Focus on `createStory()` → `refreshStories()` → `loadStory()` chain
- Check for async timing issues
- Investigate file watcher interference

## Key Files to Investigate

- `packages/tui/src/store/index.ts` - `createStory()` action (lines 172-203)
- `packages/tui/src/components/App.tsx` - View orchestration
- `packages/tui/src/components/Dashboard.tsx` - Component that should appear

## Confidence Assessment

**Overall Confidence**: Medium-High (70%)

**High Confidence Items:**
- User successfully submitted title
- Story files likely created
- Bug is deterministic
- Terminal has sufficient size

**Medium Confidence Items:**
- Exact symptom (nothing vs. partial rendering)
- Whether manual loading works
- Root cause location (state vs. view vs. render)

**Key Uncertainty**: The exact visual symptom ("no output") could mean several things. First reproduction step should clarify this.

## Next Actions

1. **User**: Answer the 6 open questions above
2. **Developer**: Reproduce bug locally following exact steps
3. **Developer**: Add debug logging to trace execution flow
4. **Developer**: Identify breakpoint where expected behavior diverges
5. **Developer**: Implement fix and verify all acceptance criteria
6. **Developer**: Add regression test to prevent recurrence
