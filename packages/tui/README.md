# @engineering-process/tui

A Terminal User Interface (TUI) for the engineering-process Claude Code plugin. Provides visual progress tracking, interactive navigation, and automated workflow execution.

## Installation

```bash
# From the packages/tui directory
npm install

# Build the package
npm run build
```

## Usage

```bash
# Launch the TUI in the current directory
npx ep-tui

# Specify a project directory
npx ep-tui --project /path/to/project

# Open a specific story directly
npx ep-tui --project . --story my-feature

# Run in headless mode (for testing)
npx ep-tui --headless --story test-story
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--project` | `-p` | Target project directory | Current directory (`.`) |
| `--story` | `-s` | Story slug to open directly | None (shows story picker) |
| `--headless` | | Run in headless mode for testing | `false` |
| `--help` | | Show help message | |
| `--version` | | Show version number | |

## Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate task list |
| `Enter` | Start workflow / Select story |
| `PgUp` / `PgDn` | Scroll output panel |

### Workflow Control

| Key | Action |
|-----|--------|
| `p` | Pause workflow (finish current task, then stop) |
| `r` | Resume / Start workflow |

### General

| Key | Action |
|-----|--------|
| `s` | Open story picker |
| `q` | Quit application |
| `?` | Toggle help modal |
| `Esc` | Close modal / Cancel |

## Dashboard Layout

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Story: my-feature              Phase: 6/8 (implement)           ┃
┃  Progress: 1 2 3 4 5 [6] 7 8                                     ┃
┃  Tasks:    ████████████░░░░ 75% (12/16)                          ┃
┣━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  TASK LIST          ┃  CLAUDE OUTPUT                             ┃
┃  ──────────────────  ┃  ─────────────────────────────────────────  ┃
┃  [x] 1.1 Setup      ┃  > Starting Task 2.2: API endpoints        ┃
┃  [x] 1.2 Config     ┃  Reading design document...                ┃
┃  [x] 2.1 Model      ┃  Creating src/api/endpoints.ts...          ┃
┃  [~] 2.2 API  <     ┃                                            ┃
┃  [ ] 2.3 Tests      ┃  [streaming output continues...]           ┃
┣━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  [p]ause [r]esume [s]tory [q]uit [?]help    Task 2.2: 00:02:34   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Task Status Indicators

| Symbol | Status |
|--------|--------|
| `[ ]` | Incomplete |
| `[~]` | In Progress |
| `[x]` | Complete |

## Project Structure

The TUI expects stories to be located in `<project>/docs/stories/<story-slug>/`:

```
project/
└── docs/
    └── stories/
        └── my-feature/
            ├── workflow-state.json    # Progress tracking
            ├── tasks.md               # Task breakdown
            ├── design.md              # Design document (optional)
            └── research-notes.md      # Research notes (optional)
```

## Configuration

### workflow-state.json

The workflow state file tracks the current phase and progress:

```json
{
  "story": "My Feature",
  "slug": "my-feature",
  "source": "direct",
  "currentPhase": "implement",
  "completedPhases": ["understand", "research", "scope", "design", "decompose"],
  "startedAt": "2024-01-01T00:00:00Z"
}
```

### tasks.md

Tasks are parsed from a markdown file with the following format:

```markdown
# Tasks: My Feature

## Phase 1: Foundation

- [ ] **Task 1.1**: Create initial structure
  - **Description**: Set up the basic file structure
  - **Files**: `src/index.ts`
  - **Done when**: File exists and exports main function

- [x] **Task 1.2**: Add configuration
  - **Description**: Add tsconfig and package.json
  - **Done when**: Both files exist and are valid
```

## Development

```bash
# Run in development mode (watch for changes)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

## Architecture

The TUI is built with:

- **Ink v5** - React for the terminal
- **React 18** - Component framework
- **Zustand** - State management
- **execa** - Subprocess handling for Claude CLI
- **chokidar** - File watching for real-time updates
- **meow** - CLI argument parsing
- **TypeScript** - Type safety
- **tsup** - Build tooling
- **Vitest** - Testing framework

### Key Design Decisions

1. **Fresh Context Per Task**: Following the "Ralph Wiggum" pattern from `loop.sh`, each task spawns a fresh Claude CLI process to prevent context pollution and ensure consistent quality.

2. **Pause Behavior**: Pausing allows the current task to complete before stopping, rather than killing the process mid-execution. This prevents leaving the codebase in an unknown state.

3. **File Watching**: Real-time updates when `workflow-state.json` or `tasks.md` change, enabling integration with external tools.

## Requirements

- Node.js 20+ (LTS)
- Claude CLI installed and in PATH

## License

MIT
