# Tasks: TUI Inline Story Creation

## Overview

Implementation tasks for adding inline story creation to the TUI StoryPicker component.

**Design Document**: [design.md](./design.md)

## Tasks

### Phase 1: Foundation (Utilities)

- [x] **Task 1.1**: Create slugify utility with tests
  - **Description**: Create `src/utils/slugify.ts` with `slugify()` and `ensureUniqueSlug()` functions. Write unit tests first (TDD).
  - **Files**: `src/utils/slugify.ts`, `tests/unit/slugify.test.ts`
  - **Done when**: All unit tests pass. `slugify("Add User Auth!")` returns `"add-user-auth"`. `ensureUniqueSlug("my-story", ["my-story"])` returns `"my-story-2"`.
  - **Dependencies**: None

### Phase 2: Component (StoryCreator)

- [x] **Task 2.1**: Create StoryCreator component with tests
  - **Description**: Create `src/components/StoryCreator.tsx` that renders a text input for story title entry. Support Enter to submit, Escape to cancel, and display error messages. Write component tests first.
  - **Files**: `src/components/StoryCreator.tsx`, `tests/components/StoryCreator.test.tsx`
  - **Done when**: Component renders title input. Enter triggers onSubmit with input value. Escape triggers onCancel. Error prop displays in red.
  - **Dependencies**: None

### Phase 3: Store (createStory Action)

- [x] **Task 3.1**: Add createStory action to Zustand store
  - **Description**: Add `createStory(title: string): Promise<string>` action to the TUIStore. Creates story directory, writes initial workflow-state.json, refreshes stories, and loads the new story.
  - **Files**: `src/store/index.ts`, `src/types/ui.ts`
  - **Done when**: Calling `createStory("My Title")` creates `docs/stories/my-title/workflow-state.json`, refreshes story list, and transitions to dashboard view.
  - **Dependencies**: Task 1.1 (slugify utility)

### Phase 4: Integration (Wire Components)

- [x] **Task 4.1**: Add 'n' key handler to useKeyboard
  - **Description**: Extend `useKeyboard.ts` to call `onCreateStory` when 'n' is pressed in picker view. Add new option to `UseKeyboardOptions` interface.
  - **Files**: `src/hooks/useKeyboard.ts`
  - **Done when**: Pressing 'n' in picker view triggers the `onCreateStory` callback.
  - **Dependencies**: None

- [x] **Task 4.2**: Integrate StoryCreator into StoryPicker
  - **Description**: Modify `StoryPicker.tsx` to show "Create New Story [n]" prompt. Accept new props for creation mode. Conditionally render StoryCreator when `isCreating` is true.
  - **Files**: `src/components/StoryPicker.tsx`
  - **Done when**: StoryPicker shows "Create New Story [n]" option. When `isCreating=true`, renders StoryCreator instead of list.
  - **Dependencies**: Task 2.1 (StoryCreator component)

- [x] **Task 4.3**: Wire up App.tsx with creation state and handlers
  - **Description**: Add local state (`isCreatingStory`, `createError`) to App.tsx. Add handlers for create/submit/cancel. Pass new props to StoryPicker and useKeyboard.
  - **Files**: `src/components/App.tsx`
  - **Done when**: Pressing 'n' in picker shows StoryCreator. Submitting title creates story and shows dashboard. Escape cancels. Empty title shows error.
  - **Dependencies**: Tasks 3.1, 4.1, 4.2

### Phase 5: E2E Testing

- [x] **Task 5.1**: Write E2E tests for story creation flow
  - **Description**: Create `tests/e2e/storyCreation.test.ts` with tests for: full creation flow, empty input error, escape cancellation, duplicate slug handling.
  - **Files**: `tests/e2e/storyCreation.test.ts`
  - **Done when**: All E2E tests pass. Tests cover happy path and error cases.
  - **Dependencies**: Tasks 4.3 (full integration complete)

## Dependencies Graph

```
Task 1.1 (slugify)
    |
    v
Task 3.1 (createStory)
    |
    v
Task 4.3 (App integration) <-- Task 4.1 (keyboard)
    ^                          Task 4.2 (StoryPicker)
    |                               ^
    |                               |
    |                          Task 2.1 (StoryCreator)
    v
Task 5.1 (E2E tests)
```

## Estimated Effort

| Task | Estimate | Rationale |
|------|----------|-----------|
| 1.1  | ~30min   | Pure functions with straightforward tests |
| 2.1  | ~45min   | Small component, Ink TextInput pattern |
| 3.1  | ~30min   | Store action with file I/O |
| 4.1  | ~15min   | Simple key handler addition |
| 4.2  | ~30min   | Conditional rendering, prop threading |
| 4.3  | ~45min   | State management, handler wiring, validation |
| 5.1  | ~45min   | E2E setup with temp directories |

**Total**: ~4 hours
