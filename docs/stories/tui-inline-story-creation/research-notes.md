# Research Notes: TUI Inline Story Creation

## Architecture Overview

The TUI is a **fully-implemented** Ink v5 + React 18 application using:
- **Zustand** for state management
- **tsup** for building (TypeScript → ESM)
- **Vitest** for testing
- **Node.js built-ins** for file I/O

## File Structure

```
packages/tui/
├── src/
│   ├── components/     # React components (StoryPicker, Dashboard, etc.)
│   ├── store/          # Zustand state management
│   ├── hooks/          # Custom hooks (useKeyboard, etc.)
│   └── utils/          # Utility functions
├── tests/
│   ├── fixtures/       # Test fixtures (workflow-state.json, tasks.md)
│   ├── unit/           # Unit tests
│   └── components/     # Component tests
├── dist/               # Built output
└── vitest.config.ts    # Test configuration
```

## Key Findings

### 1. Menu System (StoryPicker)

**Location**: `src/components/StoryPicker.tsx` (built: `dist/index.js:104-152`)

- Receives `stories: StoryInfo[]` as props
- Renders list with Up/Down arrow navigation
- Enter key calls `onSelect(slug)` callback
- Shows empty state: "No stories found in docs/stories/"
- **Currently NO "Create New Story" option exists** - this is the feature gap

### 2. State Management (Zustand Store)

**Location**: `src/store/index.ts` (built: `dist/index.js:1218-1340`)

Key state:
- `stories: StoryInfo[]` - list of discovered stories
- `currentStory: string | null` - selected story slug
- `view: 'picker' | 'dashboard' | 'help'` - current view

Key actions:
- `loadStory(slug)` - loads specific story into store
- `refreshStories()` - re-scans directory, updates stories list
- `setView(view)` - changes current view

### 3. File Operations

Existing utilities:
- `readFileSafe()` - safe file reading with error handling
- `getStoryDir()` - returns `docs/stories/<slug>/` path
- `discoverStories()` - scans `docs/stories/`, reads workflow-state.json from each

Node.js built-ins available:
- `mkdirSync()` - create directories
- `writeFileSync()` - write JSON/text files

### 4. Keyboard Handling

**Location**: `src/hooks/useKeyboard.ts`

- Uses Ink's `useInput()` hook
- View-specific key handlers
- Currently handles: arrows (navigation), Enter (select), q (quit), ? (help)

### 5. Test Infrastructure

- **Framework**: Vitest + ink-testing-library
- **Location**: `packages/tui/tests/`
- **Fixtures**: `tests/fixtures/workflow-state.json`, `tasks.md`
- **Pattern**: TDD - write failing tests first, then implement

## Existing Story-Related Code

| Function | Location | Purpose |
|----------|----------|---------|
| `discoverStories()` | `src/store/index.ts` | Scans docs/stories/, reads workflow-state.json |
| `loadStory(slug)` | `src/store/index.ts` | Loads specific story into store |
| `refreshStories()` | `src/store/index.ts` | Re-scans directory, updates list |
| `getStoryDir(slug)` | `src/utils/paths.ts` | Returns story directory path |

## Recommended Approach

### UX Flow
```
StoryPicker → [Press 'n'] → TextInput → [Enter title] → [Press Enter]
  → createStory() → Dashboard (auto-load new story in Phase 1)
```

### Components/Utilities Needed

1. **TextInput Component** (new: `src/components/TextInput.tsx`)
   - Captures story title with `useInput()` hook
   - Submit on Enter, cancel on Escape

2. **Slugification Utility** (new: `src/utils/slugify.ts`)
   ```typescript
   slugify("Add User Auth!") → "add-user-auth"
   ensureUniqueSlug("my-story", existingSlugs) → "my-story-2"
   ```

3. **createStory Store Action** (modify: `src/store/index.ts`)
   ```typescript
   createStory: async (title: string) => {
     // 1. Generate unique slug
     // 2. mkdirSync(storyDir, { recursive: true })
     // 3. Write workflow-state.json with initial state
     // 4. refreshStories()
     // 5. loadStory(slug)
     // 6. setView('dashboard')
   }
   ```

4. **StoryPicker Updates** (modify: `src/components/StoryPicker.tsx`)
   - Add state: `isCreating`, `inputValue`
   - Add "Create New Story [n]" as first menu item
   - When 'n' pressed → show TextInput
   - On submit → call `createStory(input)`

5. **Keyboard Handler** (modify: `src/hooks/useKeyboard.ts`)
   - Add 'n' key handler in picker view

### Files to Modify
- `src/components/StoryPicker.tsx`
- `src/store/index.ts`
- `src/hooks/useKeyboard.ts`

### Files to Create
- `src/components/TextInput.tsx`
- `src/utils/slugify.ts`
- `tests/unit/slugify.test.ts`
- `tests/components/TextInput.test.tsx`
- `tests/e2e/storyCreation.test.ts`

## Test Patterns

Based on existing tests in `tests/`:
- Unit tests: Test pure functions in isolation
- Component tests: Use ink-testing-library's `render()`
- Fixtures: Use `tests/fixtures/` for test data

## Assumptions Verified

| Assumption | Status | Evidence |
|------------|--------|----------|
| TUI has filesystem access | VERIFIED | Uses Node.js fs in store |
| TUI uses standard story structure | VERIFIED | `getStoryDir()` returns `docs/stories/<slug>/` |
| TUI has existing story handling | VERIFIED | `discoverStories()`, `loadStory()` exist |
| Menu system is extensible | VERIFIED | StoryPicker is a React component, easy to modify |

## Risks and Considerations

1. **Duplicate slugs**: Need `ensureUniqueSlug()` to handle "my-story-2" etc.
2. **Empty input**: Validate title is not empty before creating
3. **Special characters**: Slugify must handle unicode, punctuation
4. **View transition**: Ensure smooth transition to dashboard after creation
