# Tasks: Terminal UI Implementation

## Overview

This task breakdown implements the Terminal UI (TUI) for the engineering-process plugin as specified in [design.md](./design.md). The TUI wraps the plugin with visual progress tracking, interactive navigation, and automated workflow execution.

**Key Design Decisions:**
- Fresh Claude context per task (Ralph Wiggum pattern)
- Zustand for state management
- Ink v5 + React 18 for terminal rendering
- tsup for TypeScript compilation

## Test Strategy

Following TDD principles:
1. **Phase 0**: Write failing E2E tests FIRST
2. **Each subsequent task**: Write unit tests before implementation
3. **Final phase**: Verify all tests pass

---

## Phase 0: E2E Test Setup (Write Failing Tests First)

#### Task 0.1: Initialize Test Infrastructure
**Status**: complete

**Description:** Set up Vitest and ink-testing-library configuration for the TUI package. Create test fixtures that mirror real story structures.

**Files:**
- `packages/tui/package.json` (test dependencies only)
- `packages/tui/vitest.config.ts`
- `packages/tui/tests/setup.ts`
- `packages/tui/tests/fixtures/workflow-state.json`
- `packages/tui/tests/fixtures/tasks.md`

**Done when:**
- `npm test` command runs (even if no tests yet)
- vitest.config.ts exists with ink-testing-library setup
- Fixture files match schema from design.md

**Test reference:** This task creates the test infrastructure itself

**Dependencies:** None

---

#### Task 0.2: Write Failing E2E Test - TUI Launches and Displays Story
**Status**: complete

**Description:** Write the primary E2E test that verifies the TUI can launch, load a story, and display the dashboard. This test MUST fail initially.

**Files:**
- `packages/tui/tests/e2e/workflow.test.ts`

**Done when:**
- Test file exists with test case "launches and displays story"
- Test creates temp directory with mock story
- Test spawns TUI binary with `--headless` flag
- Test verifies output contains story slug and phase
- Running `npm test` shows this test as FAILING (expected)

**Test reference:** This IS the E2E test

**Dependencies:** Task 0.1

---

#### Task 0.3: Write Failing E2E Test - Story Selection
**Status**: complete

**Description:** Write E2E test for story picker functionality. Test must fail initially.

**Files:**
- `packages/tui/tests/e2e/storySelection.test.ts`

**Done when:**
- Test file exists with test case "displays available stories"
- Test creates temp directory with multiple mock stories
- Test spawns TUI and verifies story list appears
- Running `npm test` shows this test as FAILING (expected)

**Test reference:** This IS the E2E test

**Dependencies:** Task 0.1

---

#### Task 0.4: Write Failing Unit Tests - TaskParser
**Status**: complete

**Description:** Write unit tests for the taskParser service that parses tasks.md into structured Task objects. Tests must fail initially.

**Files:**
- `packages/tui/tests/unit/taskParser.test.ts`

**Done when:**
- Test file exists with test cases for:
  - Parsing incomplete tasks `[ ]`
  - Parsing complete tasks `[x]`
  - Parsing in_progress tasks `[~]`
  - Extracting task ID, title, description, files, criteria
  - Handling malformed input gracefully
- Running `npm test` shows these tests as FAILING (expected)

**Test reference:** This IS the unit test file

**Dependencies:** Task 0.1

---

#### Task 0.5: Write Failing Unit Tests - PromptBuilder
**Status**: complete

**Description:** Write unit tests for the promptBuilder service that constructs Claude prompts with embedded context. Tests must fail initially.

**Files:**
- `packages/tui/tests/unit/promptBuilder.test.ts`

**Done when:**
- Test file exists with test cases for:
  - Building prompt with task context
  - Embedding tasks.md content
  - Handling missing design.md gracefully
  - Handling missing research-notes.md gracefully
- Running `npm test` shows these tests as FAILING (expected)

**Test reference:** This IS the unit test file

**Dependencies:** Task 0.1

---

#### Task 0.6: Write Failing Component Tests - PhaseProgress
**Status**: complete

**Description:** Write component tests for PhaseProgress using ink-testing-library. Tests must fail initially.

**Files:**
- `packages/tui/tests/components/PhaseProgress.test.tsx`

**Done when:**
- Test file exists with test cases for:
  - Highlighting current phase with brackets
  - Showing completed phases
  - Rendering all 8 phases
- Running `npm test` shows these tests as FAILING (expected)

**Test reference:** This IS the component test file

**Dependencies:** Task 0.1

---

#### Task 0.7: Write Failing Component Tests - TaskListPanel
**Status**: complete

**Description:** Write component tests for TaskListPanel using ink-testing-library. Tests must fail initially.

**Files:**
- `packages/tui/tests/components/TaskListPanel.test.tsx`

**Done when:**
- Test file exists with test cases for:
  - Rendering task list with status indicators
  - Highlighting active task
  - Showing correct status symbols ([ ], [x], [~])
- Running `npm test` shows these tests as FAILING (expected)

**Test reference:** This IS the component test file

**Dependencies:** Task 0.1

---

## Phase 1: Project Foundation

#### Task 1.1: Create Package Structure and Configuration
**Status**: complete

**Description:** Initialize the packages/tui directory with package.json, tsconfig.json, and tsup.config.ts. Install all dependencies.

**Files:**
- `packages/tui/package.json`
- `packages/tui/tsconfig.json`
- `packages/tui/tsup.config.ts`

**Done when:**
- package.json has all dependencies from design.md
- tsconfig.json targets ES2022, strict mode
- tsup.config.ts configured for ESM output
- `npm install` succeeds in packages/tui

**Test reference:** E2E tests (0.2, 0.3) will verify package builds

**Dependencies:** Tasks 0.1-0.7 (tests must exist first)

---

#### Task 1.2: Define TypeScript Types
**Status**: complete

**Description:** Create type definitions for WorkflowState, Task, Phase, and UI state as specified in design.md.

**Files:**
- `packages/tui/src/types/workflow.ts`
- `packages/tui/src/types/task.ts`
- `packages/tui/src/types/ui.ts`
- `packages/tui/src/types/index.ts`

**Done when:**
- WorkflowState interface matches design.md schema exactly
- Task interface includes id, title, status, description, files, criteria, dependencies
- Phase type is union of 8 phase strings
- TUIStore interface defined for Zustand
- All types exported from index.ts barrel

**Test reference:** Unit tests will use these types (compile-time verification)

**Dependencies:** Task 1.1

---

#### Task 1.3: Create Utility Functions
**Status**: complete

**Description:** Implement utility functions for formatting (progress bars, time) and file operations.

**Files:**
- `packages/tui/src/utils/formatting.ts`
- `packages/tui/src/utils/files.ts`
- `packages/tui/src/utils/constants.ts`
- `packages/tui/src/utils/index.ts`

**Done when:**
- `formatDuration(seconds)` returns human-readable time
- `drawProgressBar(current, total, width)` returns Unicode bar
- `readFileSafe(path)` returns content or null
- `PHASES` constant array defined
- Utility tests pass (if any)

**Test reference:** formatDuration, drawProgressBar tested via component tests

**Dependencies:** Task 1.2

---

#### Task 1.4: Create CLI Entry Point
**Status**: complete

**Description:** Implement the CLI entry point with argument parsing using meow.

**Files:**
- `packages/tui/bin/ep-tui.js`
- `packages/tui/src/cli.ts`

**Done when:**
- bin/ep-tui.js has shebang and loads compiled CLI
- cli.ts parses --project, --story, --headless flags
- cli.ts calls render function from index.tsx
- `npx ep-tui --help` shows usage

**Test reference:** E2E tests (0.2, 0.3) verify CLI launches

**Dependencies:** Task 1.1

---

## Phase 2: Core Services

#### Task 2.1: Implement TaskParser Service
**Status**: complete

**Description:** Create the taskParser service that parses tasks.md files into Task[] arrays.

**Files:**
- `packages/tui/src/services/taskParser.ts`
- `packages/tui/src/services/index.ts`

**Done when:**
- `parseTasksFile(content: string): Task[]` implemented
- Regex matches `- [ ]`, `- [x]`, `- [~]` patterns
- Extracts task ID from `**Task X.Y**:` pattern
- Extracts Description, Files, Done when fields
- Unit tests (0.4) PASS

**Test reference:** Task 0.4 (taskParser.test.ts)

**Dependencies:** Task 1.2

---

#### Task 2.2: Implement PromptBuilder Service
**Status**: complete

**Description:** Create the promptBuilder service that constructs prompts with embedded context following loop.sh pattern.

**Files:**
- `packages/tui/src/services/promptBuilder.ts`

**Done when:**
- `buildPrompt(context: PromptContext): string` implemented
- Prompt template matches design.md specification
- Reads tasks.md, design.md, research-notes.md
- Handles missing files gracefully (optional content)
- Unit tests (0.5) PASS

**Test reference:** Task 0.5 (promptBuilder.test.ts)

**Dependencies:** Tasks 1.2, 1.3, 2.1

---

#### Task 2.3: Implement ClaudeRunner Service
**Status**: complete

**Description:** Create the ClaudeRunner service that spawns and manages Claude CLI subprocesses.

**Files:**
- `packages/tui/src/services/claudeRunner.ts`

**Done when:**
- `spawn(prompt: string): ChildProcess` implemented using execa
- `kill()` terminates running process
- `isRunning()` returns boolean
- `onOutput(callback)` streams stdout/stderr
- `onExit(callback)` fires on process exit
- FORCE_COLOR env variable preserved

**Test reference:** E2E tests (0.2) verify Claude spawning

**Dependencies:** Task 1.1 (execa dependency)

---

#### Task 2.4: Implement FileWatcher Service
**Status**: complete

**Description:** Create the FileWatcher service using chokidar to watch story files for changes.

**Files:**
- `packages/tui/src/services/fileWatcher.ts`

**Done when:**
- `watch(storyDir: string)` starts watching
- `stop()` stops watching
- `onWorkflowChange(callback)` fires on workflow-state.json change
- `onTasksChange(callback)` fires on tasks.md change
- Debouncing prevents duplicate events

**Test reference:** Integration verified via E2E tests

**Dependencies:** Task 1.1 (chokidar dependency)

---

#### Task 2.5: Implement WorkflowOrchestrator Service
**Status**: complete

**Description:** Create the WorkflowOrchestrator that coordinates task execution, validation, and phase advancement.

**Files:**
- `packages/tui/src/services/workflowOrchestrator.ts`

**Done when:**
- `executeNextTask()` finds and executes next incomplete task
- `pause()` stops auto-advance (but allows current task to complete)
- `resume()` continues from paused state
- `runValidation()` calls run-validation.sh
- `markTaskStatus(taskId, status)` updates tasks.md
- Integrates with ClaudeRunner, PromptBuilder, TaskParser

**Test reference:** E2E tests verify workflow execution

**Dependencies:** Tasks 2.1, 2.2, 2.3, 2.4

---

## Phase 3: State Management

#### Task 3.1: Implement Zustand Store
**Status**: complete

**Description:** Create the Zustand store with all state slices and actions as defined in design.md.

**Files:**
- `packages/tui/src/store/index.ts`

**Done when:**
- Store interface matches TUIStore from design.md
- Story state: stories[], currentStory, loadStory(), refreshStories()
- Task state: tasks[], activeTaskId, selectedTaskIndex, selectTask()
- Process state: isRunning, isPaused, output[], appendOutput(), clearOutput()
- UI state: view ('picker' | 'dashboard' | 'help')
- Timing: taskStartTime

**Test reference:** Component tests verify store integration

**Dependencies:** Tasks 1.2, 2.5

---

#### Task 3.2: Implement Store Selectors
**Status**: complete

**Description:** Create derived selectors for computed state like progress percentage, next task, etc.

**Files:**
- `packages/tui/src/store/selectors.ts`

**Done when:**
- `selectCompletedCount(state)` returns count of complete tasks
- `selectProgress(state)` returns percentage (0-100)
- `selectNextTask(state)` returns first incomplete task
- `selectCurrentPhaseIndex(state)` returns 1-8
- Selectors are memoized properly

**Test reference:** Unit tests for selector logic

**Dependencies:** Task 3.1

---

## Phase 4: UI Components

#### Task 4.1: Implement PhaseProgress Component
**Status**: complete

**Description:** Create the PhaseProgress component that displays the 8-phase progress indicator.

**Files:**
- `packages/tui/src/components/PhaseProgress.tsx`
- `packages/tui/src/components/index.ts`

**Done when:**
- Renders phases 1-8 horizontally
- Completed phases shown in green
- Current phase bracketed and highlighted
- Future phases dimmed
- Component tests (0.6) PASS

**Test reference:** Task 0.6 (PhaseProgress.test.tsx)

**Dependencies:** Tasks 1.2, 1.3

---

#### Task 4.2: Implement TaskItem Component
**Status**: complete

**Description:** Create the TaskItem component for rendering individual tasks with status.

**Files:**
- `packages/tui/src/components/TaskItem.tsx`

**Done when:**
- Renders task ID and title
- Shows status indicator: [ ] incomplete, [x] complete, [~] in_progress
- Highlights when active (being executed)
- Highlights when selected (keyboard navigation)
- Truncates long titles with ellipsis

**Test reference:** TaskListPanel tests (0.7) cover this

**Dependencies:** Task 1.2

---

#### Task 4.3: Implement TaskListPanel Component
**Status**: complete

**Description:** Create the TaskListPanel component that renders the scrollable task list.

**Files:**
- `packages/tui/src/components/TaskListPanel.tsx`

**Done when:**
- Renders list of TaskItem components
- Supports scrolling for long lists
- Highlights activeTaskId
- Highlights selectedIndex
- Component tests (0.7) PASS

**Test reference:** Task 0.7 (TaskListPanel.test.tsx)

**Dependencies:** Tasks 4.2, 3.1

---

#### Task 4.4: Implement OutputPanel Component
**Status**: complete

**Description:** Create the OutputPanel component for streaming Claude output.

**Files:**
- `packages/tui/src/components/OutputPanel.tsx`

**Done when:**
- Renders output lines from store
- Auto-scrolls to bottom on new content
- Preserves ANSI color codes
- Implements ring buffer (1000 lines max)
- Supports manual scroll with Page Up/Down

**Test reference:** E2E tests verify output display

**Dependencies:** Task 3.1

---

#### Task 4.5: Implement Header Component
**Status**: complete

**Description:** Create the Header component with story name and progress display.

**Files:**
- `packages/tui/src/components/Header.tsx`

**Done when:**
- Displays story slug and title
- Shows current phase and phase number (e.g., "Phase: 6/8 (implement)")
- Includes PhaseProgress component
- Shows task progress bar with percentage

**Test reference:** E2E tests verify header display

**Dependencies:** Tasks 4.1, 3.1

---

#### Task 4.6: Implement StatusBar Component
**Status**: complete

**Description:** Create the StatusBar component with keyboard hints and timer.

**Files:**
- `packages/tui/src/components/StatusBar.tsx`

**Done when:**
- Shows keyboard hints: [p]ause, [r]esume, [s]tory, [q]uit, [?]help
- Enables/disables hints based on state (e.g., pause only when running)
- Shows task timer when task is executing
- Updates timer every second

**Test reference:** E2E tests verify status bar

**Dependencies:** Task 3.1

---

#### Task 4.7: Implement StoryPicker Component
**Status**: complete

**Description:** Create the StoryPicker modal for selecting stories.

**Files:**
- `packages/tui/src/components/StoryPicker.tsx`

**Done when:**
- Lists all stories from docs/stories/
- Shows phase and task progress for each
- Arrow keys navigate list
- Enter selects, Escape cancels
- Stories sorted by last modified (most recent first)
- E2E test (0.3) PASSES

**Test reference:** Task 0.3 (storySelection.test.ts)

**Dependencies:** Tasks 3.1, 1.3

---

#### Task 4.8: Implement Dashboard Component
**Status**: complete

**Description:** Create the main Dashboard layout component.

**Files:**
- `packages/tui/src/components/Dashboard.tsx`

**Done when:**
- Flexbox layout: Header top, Main middle, StatusBar bottom
- Main area: TaskListPanel left (30%), OutputPanel right (70%)
- Handles terminal resize
- Minimum size fallback (80x24)

**Test reference:** E2E tests verify dashboard display

**Dependencies:** Tasks 4.3, 4.4, 4.5, 4.6

---

#### Task 4.9: Implement HelpModal Component
**Status**: complete

**Description:** Create the HelpModal that displays keyboard shortcuts and help text.

**Files:**
- `packages/tui/src/components/HelpModal.tsx`

**Done when:**
- Lists all keyboard shortcuts with descriptions
- Escape key closes modal
- Overlays on top of Dashboard

**Test reference:** Manual verification

**Dependencies:** Task 3.1

---

## Phase 5: Integration and Hooks

#### Task 5.1: Implement useKeyboard Hook
**Status**: complete

**Description:** Create the useKeyboard hook for handling global keyboard input.

**Files:**
- `packages/tui/src/hooks/useKeyboard.ts`
- `packages/tui/src/hooks/index.ts`

**Done when:**
- Uses ink's useInput hook
- Handles: p (pause), r (resume), s (story), q (quit), ? (help)
- Arrow keys for navigation
- Enter to start/select
- Dispatches to store actions

**Test reference:** E2E tests verify keyboard handling

**Dependencies:** Tasks 3.1, 2.5

---

#### Task 5.2: Implement useFileWatcher Hook
**Status**: complete

**Description:** Create the useFileWatcher hook that sets up file watching on mount.

**Files:**
- `packages/tui/src/hooks/useFileWatcher.ts`

**Done when:**
- Starts watching on story load
- Stops watching on unmount
- Updates store on file changes
- Re-parses tasks.md on change
- Re-loads workflow-state.json on change

**Test reference:** E2E tests verify file watching

**Dependencies:** Tasks 2.4, 3.1

---

#### Task 5.3: Implement useTimer Hook
**Status**: complete

**Description:** Create the useTimer hook for the task elapsed time display.

**Files:**
- `packages/tui/src/hooks/useTimer.ts`

**Done when:**
- Returns elapsed seconds since taskStartTime
- Updates every second when task is running
- Returns 0 when no task running
- Cleans up interval on unmount

**Test reference:** StatusBar tests verify timer

**Dependencies:** Task 3.1

---

#### Task 5.4: Implement App Component
**Status**: complete

**Description:** Create the root App component that orchestrates the entire TUI.

**Files:**
- `packages/tui/src/components/App.tsx`

**Done when:**
- Initializes stores on mount
- Scans docs/stories/ for available stories
- Shows StoryPicker if no initialStory
- Shows Dashboard when story selected
- Shows HelpModal on ? key
- Handles global keyboard input
- Connects all hooks
- E2E test (0.2) PASSES

**Test reference:** Tasks 0.2, 0.3 (E2E tests)

**Dependencies:** Tasks 4.7, 4.8, 4.9, 5.1, 5.2, 5.3

---

#### Task 5.5: Implement Index Entry Point
**Status**: complete

**Description:** Create the main index.tsx that renders the App with Ink.

**Files:**
- `packages/tui/src/index.tsx`

**Done when:**
- Calls `render(<App {...props} />)` from Ink
- Handles cleanup on exit (SIGINT, SIGTERM)
- Exports render function for CLI
- Kills any running Claude process on exit

**Test reference:** E2E tests verify clean startup/shutdown

**Dependencies:** Tasks 5.4, 2.3

---

## Phase 6: Final Verification

#### Task 6.1: Run All Tests and Fix Failures
**Status**: complete

**Description:** Execute the complete test suite and fix any remaining failures.

**Files:**
- Any files needing fixes

**Done when:**
- `npm test` passes all tests
- E2E tests (0.2, 0.3) pass
- Unit tests (0.4, 0.5) pass
- Component tests (0.6, 0.7) pass
- No skipped or pending tests

**Test reference:** All tests from Phase 0

**Dependencies:** All Phase 0-5 tasks

---

#### Task 6.2: Build and Verify Binary
**Status**: complete

**Description:** Build the TUI package and verify the binary works end-to-end.

**Files:**
- `packages/tui/dist/` (build output)

**Done when:**
- `npm run build` succeeds
- `npx ep-tui --help` shows usage
- `npx ep-tui --project . --story terminal-ui-implementation` launches
- Dashboard displays correctly
- Keyboard navigation works

**Test reference:** Manual E2E verification

**Dependencies:** Task 6.1

---

#### Task 6.3: Documentation
**Status**: complete

**Description:** Add README with usage instructions and update main project docs.

**Files:**
- `packages/tui/README.md`

**Done when:**
- README documents installation (`npm install`)
- README documents usage (`npx ep-tui --project PATH`)
- README documents keyboard shortcuts
- README documents configuration options

**Test reference:** Documentation review

**Dependencies:** Task 6.2

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 | 0.1-0.7 | Write failing tests FIRST (TDD) |
| 1 | 1.1-1.4 | Project foundation, types, utilities |
| 2 | 2.1-2.5 | Core services (parser, runner, orchestrator) |
| 3 | 3.1-3.2 | Zustand state management |
| 4 | 4.1-4.9 | UI components (React/Ink) |
| 5 | 5.1-5.5 | Integration, hooks, App component |
| 6 | 6.1-6.3 | Final verification and documentation |

**Total Tasks:** 28
**Estimated Time:** 20-30 hours

## Dependencies Graph

```
Phase 0 (Tests)
  |
  v
Phase 1 (Foundation) --> Phase 2 (Services) --> Phase 3 (State)
                                                    |
                                                    v
                                              Phase 4 (Components)
                                                    |
                                                    v
                                              Phase 5 (Integration)
                                                    |
                                                    v
                                              Phase 6 (Verification)
```

## Critical Path

The critical path for this implementation:

1. **0.1** Test Infrastructure (blocks all tests)
2. **0.2-0.7** Failing tests (blocks implementation)
3. **1.1** Package setup (blocks all code)
4. **1.2** Types (blocks services)
5. **2.1** TaskParser (blocks orchestrator)
6. **2.5** Orchestrator (blocks App)
7. **5.4** App component (blocks E2E pass)
8. **6.1** All tests pass (blocks completion)
