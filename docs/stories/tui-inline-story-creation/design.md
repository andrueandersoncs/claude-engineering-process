# Design: TUI Inline Story Creation

## Overview

This design adds the ability to create new stories directly from the TUI's StoryPicker component. Users can press 'n' to enter a story title, which automatically creates the story directory structure and transitions to the dashboard in Phase 1 (Understand).

## Requirements

### Functional
- FR1: Add "Create New Story [n]" option visible in StoryPicker
- FR2: 'n' key opens an inline TextInput for story title entry
- FR3: On submit (Enter): create story directory, workflow-state.json, auto-load story
- FR4: Auto-transition to Dashboard view (Phase 1: Understand)
- FR5: Empty input shows error message and returns to StoryPicker

### Non-Functional
- NF1: Follow existing Ink/Zustand patterns in the codebase
- NF2: Maintain keyboard navigation consistency (Escape to cancel)
- NF3: Handle edge cases: duplicate slugs, special characters in titles

## Design

### Architecture

```
+---------------------------+
|         App.tsx           |
|  (orchestrates views)     |
+---------------------------+
            |
            v
+---------------------------+     +---------------------------+
|     StoryPicker.tsx       |---->|    StoryCreator.tsx       |
| (list + "Create New" btn) |     | (TextInput for title)     |
+---------------------------+     +---------------------------+
            |                                 |
            v                                 v
+---------------------------+     +---------------------------+
|   useKeyboard.ts          |     |   store/index.ts          |
| (adds 'n' key handler)    |     | (createStory action)      |
+---------------------------+     +---------------------------+
                                              |
                                              v
                                  +---------------------------+
                                  |   utils/slugify.ts        |
                                  | (title -> slug conversion)|
                                  +---------------------------+
```

### Data Flow

```
User presses 'n' in picker view
        |
        v
useKeyboard detects 'n' key
        |
        v
App.tsx sets isCreatingStory = true
        |
        v
StoryPicker renders StoryCreator overlay
        |
        v
User types title, presses Enter
        |
        v
StoryCreator calls onSubmit(title)
        |
        v
App.tsx validates title (non-empty)
        |
        +---> Empty? Show error, stay in StoryCreator
        |
        v (valid)
App.tsx calls store.createStory(title)
        |
        v
store.createStory():
  1. slugify(title) -> slug
  2. ensureUniqueSlug(slug, existingSlugs)
  3. mkdirSync(docs/stories/<slug>)
  4. writeFileSync(workflow-state.json)
  5. refreshStories()
  6. loadStory(slug)  // auto-transitions to dashboard
```

### Component Hierarchy

```
App
 |
 +-- StoryPicker (view === 'picker')
 |    |
 |    +-- StoryItem (for each story)
 |    +-- CreateNewStoryItem (visual prompt)
 |    +-- StoryCreator (when isCreatingStory)
 |         |
 |         +-- TextInput (Ink component)
 |
 +-- Dashboard (view === 'dashboard')
```

### API Design

#### New Component: StoryCreator

```typescript
// src/components/StoryCreator.tsx

interface StoryCreatorProps {
  /** Callback when user submits a title */
  onSubmit: (title: string) => void;
  /** Callback when user cancels (Escape) */
  onCancel: () => void;
  /** Error message to display (empty title, duplicate, etc.) */
  error?: string | null;
}

function StoryCreator({ onSubmit, onCancel, error }: StoryCreatorProps): React.ReactElement;
```

**Internal State:**
- `inputValue: string` - Current text in the input field

**Behavior:**
- Renders a Box with label "Story title:" and TextInput
- Enter submits `inputValue` to `onSubmit`
- Escape calls `onCancel`
- Displays `error` in red if provided

#### New Utility: slugify

```typescript
// src/utils/slugify.ts

/**
 * Convert a title to a URL-safe slug.
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim leading/trailing hyphens
 *
 * @example
 * slugify("Add User Auth!") // "add-user-auth"
 * slugify("Fix Bug #123")   // "fix-bug-123"
 */
export function slugify(title: string): string;

/**
 * Ensure slug is unique by appending -2, -3, etc. if needed.
 *
 * @example
 * ensureUniqueSlug("my-story", ["my-story", "other"]) // "my-story-2"
 * ensureUniqueSlug("my-story", ["my-story", "my-story-2"]) // "my-story-3"
 */
export function ensureUniqueSlug(slug: string, existingSlugs: string[]): string;
```

#### Store Extension: createStory

```typescript
// Additions to src/store/index.ts

interface TUIStore {
  // ... existing fields ...

  /** Create a new story with the given title */
  createStory: (title: string) => Promise<string>; // Returns slug
}
```

**Implementation:**

```typescript
createStory: async (title: string): Promise<string> => {
  const existingSlugs = get().stories.map((s) => s.slug);
  const baseSlug = slugify(title);
  const slug = ensureUniqueSlug(baseSlug, existingSlugs);

  const storyDir = getStoryDir(projectDir, slug);

  // Create directory
  mkdirSync(storyDir, { recursive: true });

  // Create initial workflow-state.json
  const initialState: WorkflowState = {
    story: title,
    slug: slug,
    source: 'direct',
    currentPhase: 'understand',
    completedPhases: [],
    startedAt: new Date().toISOString(),
  };

  writeFileSync(
    join(storyDir, 'workflow-state.json'),
    JSON.stringify(initialState, null, 2)
  );

  // Refresh story list and load the new story
  await get().refreshStories();
  await get().loadStory(slug);

  return slug;
}
```

#### Keyboard Handler Extension

```typescript
// Additions to useKeyboard options
interface UseKeyboardOptions {
  // ... existing fields ...

  /** Callback when 'n' is pressed in picker view */
  onCreateStory: () => void;
}
```

**New key handler in picker view:**

```typescript
// In useInput callback, picker view section:
if (input === 'n') {
  onCreateStory();
  return;
}
```

### Data Model

No new persistent data structures. Uses existing `WorkflowState` schema from `/packages/tui/src/types/workflow.ts`:

```typescript
// Initial workflow-state.json for new story:
{
  "story": "User-provided title",
  "slug": "generated-slug",
  "source": "direct",
  "currentPhase": "understand",
  "completedPhases": [],
  "startedAt": "2024-01-13T12:00:00.000Z"
}
```

### Key Decisions

#### Decision 1: Inline TextInput vs Modal

**Context**: Need to capture story title from user in StoryPicker view.

**Options Considered**:
1. **Modal overlay** - A separate modal component that covers the story list
   - Pros: Clear visual separation, familiar pattern
   - Cons: More complex, needs focus management, extra component
2. **Inline TextInput** - Replace "Create New Story" option with TextInput when active
   - Pros: Simpler, stays in context, follows Ink patterns
   - Cons: Less visually distinct

**Decision**: Option 2 - Inline TextInput

**Rationale**:
- Ink's TextInput component integrates naturally with the existing component structure
- Simpler implementation with fewer components to manage
- Maintains the single-view paradigm already established in StoryPicker
- Escape provides clear cancel mechanism

#### Decision 2: State Management Location

**Context**: Where to manage `isCreatingStory` state.

**Options Considered**:
1. **Global Zustand store** - Add `isCreatingStory` to TUIStore
   - Pros: Accessible from anywhere, consistent with other state
   - Cons: Adds complexity to global store for view-specific state
2. **Local React state in App.tsx** - Use useState in App component
   - Pros: Keeps transient UI state local, matches existing `selectedStoryIndex` pattern
   - Cons: Passed down as prop
3. **Local state in StoryPicker** - Manage entirely within StoryPicker
   - Pros: Most encapsulated
   - Cons: Keyboard handler is in App, needs coordination

**Decision**: Option 2 - Local React state in App.tsx

**Rationale**:
- Follows the existing pattern used for `selectedStoryIndex`
- Transient UI state does not need persistence
- App.tsx already manages view transitions and keyboard handling
- Keeps the Zustand store focused on persistent/shared state

#### Decision 3: Error Handling Strategy

**Context**: How to handle empty input and other validation errors.

**Options Considered**:
1. **Prevent submit** - Disable Enter when input is empty
   - Pros: No error state to manage
   - Cons: User might not know why Enter does nothing
2. **Show inline error** - Display error message in StoryCreator
   - Pros: Clear feedback, user can correct and retry
   - Cons: More state to manage
3. **Toast notification** - Show temporary toast
   - Pros: Non-intrusive
   - Cons: Adds new UI pattern not used elsewhere

**Decision**: Option 2 - Show inline error

**Rationale**:
- Clear user feedback is essential for good UX
- Error can be cleared when user starts typing again
- Simple to implement with controlled component pattern

#### Decision 4: StoryCreator as Separate Component

**Context**: Whether to create a new component or extend StoryPicker.

**Options Considered**:
1. **Extend StoryPicker** - Add TextInput logic directly to StoryPicker
   - Pros: Fewer files, simpler imports
   - Cons: Increases StoryPicker complexity, harder to test
2. **New StoryCreator component** - Separate component rendered conditionally
   - Pros: Single responsibility, easier to test, reusable
   - Cons: More files

**Decision**: Option 2 - New StoryCreator component

**Rationale**:
- Follows single responsibility principle
- StoryPicker remains focused on listing/selecting
- StoryCreator can be unit tested in isolation
- Clear separation of concerns

### File Structure

```
packages/tui/
├── src/
│   ├── components/
│   │   ├── StoryPicker.tsx       # MODIFY: Add "Create New Story" option, render StoryCreator
│   │   └── StoryCreator.tsx      # NEW: TextInput component for story title
│   ├── hooks/
│   │   └── useKeyboard.ts        # MODIFY: Add 'n' key handler for picker view
│   ├── store/
│   │   └── index.ts              # MODIFY: Add createStory action
│   └── utils/
│       └── slugify.ts            # NEW: slugify and ensureUniqueSlug functions
├── tests/
│   ├── unit/
│   │   └── slugify.test.ts       # NEW: Unit tests for slugify utilities
│   ├── components/
│   │   └── StoryCreator.test.tsx # NEW: Component tests for StoryCreator
│   └── e2e/
│       └── storyCreation.test.ts # NEW: E2E tests for full creation flow
```

### Component Changes Summary

#### StoryPicker.tsx Changes

1. Add import for StoryCreator
2. Add props: `isCreating`, `onCreateStory`, `onSubmitCreate`, `onCancelCreate`, `createError`
3. Render "Create New Story [n]" as first item when not creating
4. Render StoryCreator overlay when `isCreating === true`
5. Update hint text to include 'n' key

#### App.tsx Changes

1. Add local state: `isCreatingStory`, `createError`
2. Add `handleCreateStory` callback (sets `isCreatingStory = true`)
3. Add `handleSubmitCreate` callback (validates, calls `store.createStory`, handles errors)
4. Add `handleCancelCreate` callback (resets `isCreatingStory`)
5. Pass new props to StoryPicker
6. Pass `onCreateStory` to useKeyboard

#### useKeyboard.ts Changes

1. Add `onCreateStory` to UseKeyboardOptions interface
2. Add 'n' key handler in picker view section

#### store/index.ts Changes

1. Add `createStory` action to store interface and implementation
2. Import `mkdirSync`, `writeFileSync` from 'fs'
3. Import `slugify`, `ensureUniqueSlug` from utils

## Implementation Notes

### Focus Management

When StoryCreator is rendered, Ink's TextInput automatically captures input. When cancelled or submitted, focus returns naturally to the StoryPicker.

### Testing Strategy

1. **Unit tests (slugify.test.ts)**:
   - Test slugify with various inputs (spaces, special chars, unicode)
   - Test ensureUniqueSlug with existing slugs

2. **Component tests (StoryCreator.test.tsx)**:
   - Test rendering with/without error
   - Test Enter calls onSubmit with input value
   - Test Escape calls onCancel
   - Use ink-testing-library

3. **E2E tests (storyCreation.test.ts)**:
   - Test full flow: 'n' key -> type title -> Enter -> dashboard appears
   - Test empty input shows error
   - Test Escape returns to picker
   - Test duplicate slug handling

### Ink TextInput Note

Ink provides a TextInput component via the `ink-text-input` package (commonly used with Ink v5). If not already in dependencies, it may need to be added. Alternative: use Ink's `useInput` to build custom text capture (more work but no extra dependency).

**Recommendation**: Check if `ink-text-input` is available. If not, implement minimal text capture using `useInput` and local state to avoid new dependencies.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Duplicate slugs cause overwrites | Medium | High | `ensureUniqueSlug` appends -2, -3, etc. |
| Empty title submitted | High | Low | Validate before creating, show error |
| Special characters break paths | Medium | Medium | `slugify` removes/replaces unsafe chars |
| File system errors | Low | High | Wrap in try/catch, show error to user |
| Focus issues with TextInput | Low | Medium | Test with ink-testing-library, verify Enter/Escape work |

## Open Questions

- [x] Is `ink-text-input` package available? (Need to check package.json)
- [x] Should we allow creating stories when filesystem is read-only? (Assume read-write for now)
- [ ] Should duplicate slug detection be case-insensitive? (Recommend: yes, for safety)

## Test Architecture

### Test Categories

```
tests/
├── unit/
│   └── slugify.test.ts           # Pure function tests
├── components/
│   └── StoryCreator.test.tsx     # Isolated component tests
└── e2e/
    └── storyCreation.test.ts     # Full integration tests
```

### Test Patterns (Following Existing Conventions)

**Unit Tests**: Follow `taskParser.test.ts` pattern
- Import function under test
- Describe blocks for categories
- Test happy path, edge cases, error handling

**Component Tests**: Use ink-testing-library
- `render(<Component />)` to get test instance
- `lastFrame()` to check rendered output
- `stdin.write()` to simulate input

**E2E Tests**: Follow `storySelection.test.ts` pattern
- Create temp directory with test fixtures
- Launch TUI binary with execa
- Assert on stdout content
- Clean up temp directory after

### Test Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| slugify.ts | 100% | Pure functions, easy to test exhaustively |
| StoryCreator.tsx | 90%+ | Core user interaction component |
| createStory action | 80%+ | Critical path, but file I/O complicates testing |
| E2E flow | Key paths | Full happy path + error cases |
