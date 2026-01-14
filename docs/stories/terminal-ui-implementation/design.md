# Design: Terminal UI for Engineering Process Plugin

## Overview

This design document specifies a rich Terminal User Interface (TUI) built with Node.js and Ink that wraps the engineering-process plugin. The TUI provides visual progress tracking, interactive navigation, and automated workflow execution by spawning Claude CLI subprocesses following the "Ralph Wiggum" pattern of fresh context per task.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Display current phase (1-8) with visual progress indicator | Must |
| FR2 | Display task list from tasks.md with completion status | Must |
| FR3 | Stream Claude CLI output in real-time | Must |
| FR4 | Auto-advance between delegated phases (2-7) | Must |
| FR5 | Pause workflow at any point | Must |
| FR6 | Resume workflow from paused state | Must |
| FR7 | Select/switch stories from docs/stories/ | Must |
| FR8 | Keyboard navigation for all actions | Must |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1 | Launch time | < 1 second |
| NFR2 | Responsive to terminal resize | Yes |
| NFR3 | Memory usage | < 100MB |
| NFR4 | Platform support | macOS, Linux |
| NFR5 | Node.js version | 20+ LTS |

## Architecture

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        Terminal UI (Ink)                          |
+------------------------------------------------------------------+
|  +-----------------+  +------------------+  +------------------+  |
|  |   Dashboard     |  |    TaskList      |  |   OutputPanel    |  |
|  |   Component     |  |    Component     |  |    Component     |  |
|  +-----------------+  +------------------+  +------------------+  |
+------------------------------------------------------------------+
|                       State Management Layer                      |
|  +------------------+  +------------------+  +------------------+ |
|  | WorkflowState    |  |   TaskState      |  |  ProcessState    | |
|  | (Zustand store)  |  | (parsed tasks)   |  | (subprocess)     | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
|                        Service Layer                              |
|  +------------------+  +------------------+  +------------------+ |
|  | FileWatcher      |  | TaskParser       |  | ClaudeRunner     | |
|  | (chokidar)       |  | (tasks.md)       |  | (execa)          | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
|                      File System / CLI                            |
|  +------------------+  +------------------+  +------------------+ |
|  | workflow-state   |  | tasks.md         |  | claude CLI       | |
|  | .json            |  | design.md        |  | subprocess       | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### Data Flow

```
                     +-------------------+
                     |   File System     |
                     | (workflow-state   |
                     |  tasks.md, etc)   |
                     +--------+----------+
                              |
                              | chokidar watch
                              v
+---------------+    +--------+----------+    +------------------+
|               |    |   FileWatcher     |    |                  |
| User Input    +--->+   Service         +--->+  Zustand Store   |
| (keyboard)    |    |                   |    |  (global state)  |
+---------------+    +-------------------+    +--------+---------+
                                                       |
                              +------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                     React/Ink Components                          |
|  +------------+  +------------+  +------------+  +------------+  |
|  | Header     |  | PhaseBar   |  | TaskList   |  | Output     |  |
|  +------------+  +------------+  +------------+  +------------+  |
+------------------------------------------------------------------+
                              |
                              | spawn subprocess
                              v
+------------------------------------------------------------------+
|                     ClaudeRunner Service                          |
|  +------------------+  +------------------+  +------------------+ |
|  | Build Prompt     |  | Spawn Process    |  | Stream Output    | |
|  | (embed context)  |  | (execa)          |  | (to store)       | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### Component Tree

```
<App>
  |
  +-- <StoryPicker>              # Modal for story selection
  |
  +-- <Dashboard>                 # Main container
        |
        +-- <Header>              # Story name, phase indicator
        |     |
        |     +-- <PhaseProgress> # 1 2 3 [4] 5 6 7 8 visual
        |
        +-- <MainPanel>           # Flexbox row container
        |     |
        |     +-- <TaskListPanel> # Left sidebar (30%)
        |     |     |
        |     |     +-- <TaskItem>  # Individual task with status
        |     |
        |     +-- <OutputPanel>   # Right main area (70%)
        |           |
        |           +-- <ScrollableOutput>  # Streaming text
        |
        +-- <StatusBar>           # Footer with controls
              |
              +-- <KeyHints>      # [p]ause [r]esume [q]uit
              +-- <Timer>         # Task elapsed time
```

## Component Design

### App Component

The root component managing global state and keyboard input.

```typescript
// src/components/App.tsx

interface AppProps {
  projectDir: string;       // Target project directory
  initialStory?: string;    // Optional story slug to open
}

// Responsibilities:
// - Initialize stores
// - Set up file watchers
// - Handle global keyboard input
// - Render main layout or story picker
```

**Key Behaviors:**
- On mount: scan `docs/stories/` for available stories
- If `initialStory` provided: load that story directly
- If no stories: show empty state with instructions
- Global key handlers: `q` quit, `?` help, `s` story picker

### StoryPicker Component

Modal overlay for selecting a story to work on.

```typescript
// src/components/StoryPicker.tsx

interface StoryPickerProps {
  stories: StoryInfo[];      // List of available stories
  onSelect: (slug: string) => void;
  onCancel: () => void;
}

interface StoryInfo {
  slug: string;
  title: string;
  phase: Phase;
  tasksComplete: number;
  tasksTotal: number;
  updatedAt: Date;
}
```

**Key Behaviors:**
- Arrow keys navigate list
- Enter selects story
- Escape cancels
- Stories sorted by last modified (most recent first)
- Shows phase and task progress for each story

### Dashboard Component

Main container managing the layout.

```typescript
// src/components/Dashboard.tsx

interface DashboardProps {
  story: WorkflowState;
  tasks: Task[];
  output: string[];
  isRunning: boolean;
  isPaused: boolean;
}
```

**Layout:**
```
+------------------------------------------------------------------+
|  Header: Story name + Phase progress                              |
+------------------+-----------------------------------------------+
|                  |                                               |
|  Task List       |  Claude Output                                |
|  (scrollable)    |  (scrollable, streaming)                      |
|                  |                                               |
+------------------+-----------------------------------------------+
|  Status Bar: Controls + Timer                                     |
+------------------------------------------------------------------+
```

### Header Component

Displays story info and phase progress.

```typescript
// src/components/Header.tsx

interface HeaderProps {
  storySlug: string;
  storyTitle: string;
  currentPhase: Phase;
  completedPhases: Phase[];
}
```

**Visual Design:**
```
  Story: terminal-ui-implementation    Phase: 6/8 (implement)
  Progress: 1 2 3 4 5 [6] 7 8
  Tasks:    ████████████░░░░ 75% (12/16)
```

### PhaseProgress Component

Visual indicator of 8-phase progress.

```typescript
// src/components/PhaseProgress.tsx

interface PhaseProgressProps {
  currentPhase: Phase;
  completedPhases: Phase[];
}

// Phase display states:
// - Completed: green number
// - Current: [number] with highlight
// - Future: dim number
```

**Rendering Logic:**
```typescript
const PHASES = ['understand', 'research', 'scope', 'design',
                'decompose', 'implement', 'validate', 'deploy'];

// For each phase:
// if (completedPhases.includes(phase)) -> green
// else if (phase === currentPhase) -> cyan + brackets
// else -> dim
```

### TaskListPanel Component

Scrollable list of tasks with status indicators.

```typescript
// src/components/TaskListPanel.tsx

interface TaskListPanelProps {
  tasks: Task[];
  activeTaskId: string | null;
  selectedIndex: number;
  onSelectTask: (id: string) => void;
}

// Task status visual:
// [ ] incomplete - dim
// [~] in_progress - yellow, spinner
// [x] complete - green checkmark
// [!] blocked - red
```

**Key Behaviors:**
- Up/Down arrows scroll selection
- Highlights active task being worked on
- Shows task ID and title
- Truncates long titles with ellipsis

### OutputPanel Component

Streaming output from Claude subprocess.

```typescript
// src/components/OutputPanel.tsx

interface OutputPanelProps {
  lines: string[];
  maxLines?: number;  // Default: 1000
  autoScroll: boolean;
}
```

**Key Behaviors:**
- Auto-scrolls to bottom when new output arrives
- Page Up/Down for manual scrolling
- Preserves ANSI colors from Claude output
- Ring buffer to limit memory (1000 lines default)

### StatusBar Component

Footer with controls and status info.

```typescript
// src/components/StatusBar.tsx

interface StatusBarProps {
  isRunning: boolean;
  isPaused: boolean;
  currentTaskId: string | null;
  taskStartTime: Date | null;
  keyHints: KeyHint[];
}

interface KeyHint {
  key: string;
  label: string;
  enabled: boolean;
}
```

**Visual Design:**
```
  [p]ause [r]esume [s]tory [q]uit [?]help    Task: 00:02:34
```

## State Management

### Zustand Store Structure

Using Zustand for lightweight, TypeScript-friendly state management.

```typescript
// src/store/index.ts

interface TUIStore {
  // Story state
  stories: StoryInfo[];
  currentStory: WorkflowState | null;

  // Task state
  tasks: Task[];
  activeTaskId: string | null;
  selectedTaskIndex: number;

  // Process state
  isRunning: boolean;
  isPaused: boolean;
  output: string[];
  currentProcess: ChildProcess | null;

  // UI state
  view: 'picker' | 'dashboard' | 'help';

  // Timing
  taskStartTime: Date | null;

  // Actions
  loadStory: (slug: string) => Promise<void>;
  refreshStories: () => Promise<void>;
  startWorkflow: () => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => Promise<void>;
  appendOutput: (text: string) => void;
  clearOutput: () => void;
  selectTask: (index: number) => void;
  setView: (view: 'picker' | 'dashboard' | 'help') => void;
}
```

### WorkflowState Interface

Matching the existing `workflow-state.json` schema exactly.

```typescript
// src/types/workflow.ts

interface WorkflowState {
  story: string;
  slug: string;
  source: string;
  jtbd?: {
    context: string;
    job: string;
    outcome: string;
  };
  currentPhase: Phase;
  completedPhases: Phase[];
  startedAt: string;
  pausedAt?: string;        // TUI extension for pause tracking
  regressionReason?: string;
  regressionFrom?: Phase;
  invalidatedArtifacts?: string[];
}

type Phase =
  | 'understand'
  | 'research'
  | 'scope'
  | 'design'
  | 'decompose'
  | 'implement'
  | 'validate'
  | 'deploy';
```

### Task Interface

Derived from parsing `tasks.md` file.

```typescript
// src/types/task.ts

interface Task {
  id: string;              // e.g., "1.1", "2.3"
  title: string;
  status: TaskStatus;
  description?: string;
  files?: string;          // Comma-separated file paths
  criteria?: string;       // Completion criteria
  dependencies?: string;   // e.g., "1.1, 1.2" or "none"
}

type TaskStatus = 'incomplete' | 'in_progress' | 'complete' | 'blocked';
```

## Subprocess Handling

### ClaudeRunner Service

Manages spawning and monitoring Claude CLI processes.

```typescript
// src/services/claudeRunner.ts

interface ClaudeRunner {
  spawn(prompt: string): ChildProcess;
  kill(): void;
  isRunning(): boolean;
  onOutput(callback: (data: string) => void): void;
  onExit(callback: (code: number) => void): void;
}

class ClaudeRunnerImpl implements ClaudeRunner {
  private process: ChildProcess | null = null;
  private outputCallbacks: ((data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];

  spawn(prompt: string): ChildProcess {
    // Follow loop.sh pattern: fresh context per task
    this.process = execa('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    this.process.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      this.outputCallbacks.forEach(cb => cb(text));
    });

    this.process.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      this.outputCallbacks.forEach(cb => cb(text));
    });

    this.process.on('exit', (code) => {
      this.exitCallbacks.forEach(cb => cb(code ?? 1));
      this.process = null;
    });

    return this.process;
  }

  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }
}
```

### Prompt Builder

Builds prompts with embedded context, matching `loop.sh` pattern.

```typescript
// src/services/promptBuilder.ts

interface PromptContext {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  taskFiles: string;
  taskCriteria: string;
  storyDir: string;
}

function buildPrompt(context: PromptContext): string {
  const tasksContent = readFileSync(
    join(context.storyDir, 'tasks.md'),
    'utf-8'
  );
  const designContent = readFileSafe(
    join(context.storyDir, 'design.md')
  );
  const researchContent = readFileSafe(
    join(context.storyDir, 'research-notes.md')
  );

  return `# Autonomous Implementation Task

You are executing a single task from an implementation plan. Focus ONLY on this task.

## Current Task: ${context.taskId} - ${context.taskTitle}

**Description:**
${context.taskDescription}

**Files to modify:**
${context.taskFiles}

**Completion Criteria:**
${context.taskCriteria}

## Instructions

1. Implement ONLY what this task requires - no more, no less
2. Write tests FIRST if the task involves new functionality (TDD)
3. Ensure all existing tests still pass
4. When complete, the task criteria above should all be satisfied

## Context

### Task Breakdown
\`\`\`markdown
${tasksContent}
\`\`\`

${designContent ? `### Design Document
\`\`\`markdown
${designContent}
\`\`\`
` : ''}

${researchContent ? `### Research Notes
\`\`\`markdown
${researchContent}
\`\`\`
` : ''}

## After Completion

When you've completed the task:
1. Verify the completion criteria are met
2. Run any relevant tests
3. Summarize what was done

Do NOT move on to other tasks. Focus exclusively on: **${context.taskTitle}**`;
}
```

### Workflow Orchestrator

Coordinates the overall workflow execution.

```typescript
// src/services/workflowOrchestrator.ts

class WorkflowOrchestrator {
  private runner: ClaudeRunner;
  private store: TUIStore;
  private validationScript: string;

  async executeNextTask(): Promise<void> {
    const task = this.getNextTask();
    if (!task) {
      this.store.setRunning(false);
      return;
    }

    // Mark task as in_progress
    await this.markTaskStatus(task.id, 'in_progress');
    this.store.setActiveTask(task.id);
    this.store.setTaskStartTime(new Date());

    // Build prompt with context
    const prompt = buildPrompt({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description ?? '',
      taskFiles: task.files ?? '',
      taskCriteria: task.criteria ?? '',
      storyDir: this.store.getStoryDir()
    });

    // Spawn Claude
    this.store.clearOutput();
    this.store.appendOutput(`> Starting Task ${task.id}: ${task.title}\n`);

    this.runner.onOutput((data) => {
      this.store.appendOutput(data);
    });

    this.runner.onExit(async (code) => {
      if (code === 0) {
        // Run validation
        const validationPassed = await this.runValidation();
        if (validationPassed) {
          await this.markTaskStatus(task.id, 'complete');
          this.store.appendOutput('\n> Task completed successfully\n');

          // Execute next task if not paused
          if (!this.store.isPaused) {
            await this.executeNextTask();
          }
        } else {
          this.store.appendOutput('\n> Validation failed\n');
        }
      } else {
        this.store.appendOutput(`\n> Task failed with exit code ${code}\n`);
      }
    });

    this.runner.spawn(prompt);
  }

  pause(): void {
    this.store.setPaused(true);
    // Note: We don't kill the current process, just stop auto-advancing
  }

  async resume(): Promise<void> {
    this.store.setPaused(false);
    if (!this.runner.isRunning()) {
      await this.executeNextTask();
    }
  }
}
```

## File Structure

```
claude-engineering-process/
+-- packages/
|   +-- tui/
|       +-- package.json
|       +-- tsconfig.json
|       +-- tsup.config.ts          # Build configuration
|       +-- vitest.config.ts        # Test configuration
|       +-- bin/
|       |   +-- ep-tui.js           # CLI entry point (shebang)
|       +-- src/
|       |   +-- index.tsx           # Ink render entry
|       |   +-- cli.ts              # Argument parsing
|       |   +-- components/
|       |   |   +-- App.tsx
|       |   |   +-- Dashboard.tsx
|       |   |   +-- Header.tsx
|       |   |   +-- PhaseProgress.tsx
|       |   |   +-- TaskListPanel.tsx
|       |   |   +-- TaskItem.tsx
|       |   |   +-- OutputPanel.tsx
|       |   |   +-- StatusBar.tsx
|       |   |   +-- StoryPicker.tsx
|       |   |   +-- HelpModal.tsx
|       |   |   +-- index.ts        # Barrel export
|       |   +-- hooks/
|       |   |   +-- useKeyboard.ts
|       |   |   +-- useFileWatcher.ts
|       |   |   +-- useTimer.ts
|       |   |   +-- index.ts
|       |   +-- services/
|       |   |   +-- claudeRunner.ts
|       |   |   +-- promptBuilder.ts
|       |   |   +-- taskParser.ts
|       |   |   +-- fileWatcher.ts
|       |   |   +-- workflowOrchestrator.ts
|       |   |   +-- index.ts
|       |   +-- store/
|       |   |   +-- index.ts        # Zustand store
|       |   |   +-- selectors.ts
|       |   +-- types/
|       |   |   +-- workflow.ts
|       |   |   +-- task.ts
|       |   |   +-- ui.ts
|       |   |   +-- index.ts
|       |   +-- utils/
|       |       +-- formatting.ts   # Progress bars, time
|       |       +-- files.ts        # File reading helpers
|       |       +-- constants.ts    # Phase names, etc.
|       +-- tests/
|           +-- setup.ts
|           +-- fixtures/
|           |   +-- workflow-state.json
|           |   +-- tasks.md
|           +-- unit/
|           |   +-- taskParser.test.ts
|           |   +-- promptBuilder.test.ts
|           |   +-- formatting.test.ts
|           +-- components/
|           |   +-- PhaseProgress.test.tsx
|           |   +-- TaskListPanel.test.tsx
|           +-- e2e/
|               +-- workflow.test.ts
|               +-- storySelection.test.ts
+-- (existing plugin structure unchanged)
```

## Test Architecture

### Test Frameworks

- **Unit Tests**: Vitest
- **Component Tests**: Vitest + ink-testing-library
- **E2E Tests**: Vitest with subprocess spawning

### Test Fixtures

```typescript
// tests/fixtures/workflow-state.json
{
  "story": "Test Story",
  "slug": "test-story",
  "source": "direct",
  "currentPhase": "implement",
  "completedPhases": ["understand", "research", "scope", "design", "decompose"],
  "startedAt": "2024-01-01T00:00:00Z"
}
```

```markdown
<!-- tests/fixtures/tasks.md -->
# Tasks: Test Story

## Phase 1: Foundation

- [ ] **Task 1.1**: Create initial structure
  - **Description**: Set up the basic file structure
  - **Files**: `src/index.ts`
  - **Done when**: File exists and exports main function

- [x] **Task 1.2**: Add configuration
  - **Description**: Add tsconfig and package.json
  - **Done when**: Both files exist and are valid
```

### Unit Test Examples

```typescript
// tests/unit/taskParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseTasksFile } from '../../src/services/taskParser';

describe('taskParser', () => {
  it('parses incomplete tasks', () => {
    const content = '- [ ] **Task 1.1**: Create structure';
    const tasks = parseTasksFile(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('1.1');
    expect(tasks[0].status).toBe('incomplete');
  });

  it('parses complete tasks', () => {
    const content = '- [x] **Task 1.1**: Create structure';
    const tasks = parseTasksFile(content);

    expect(tasks[0].status).toBe('complete');
  });

  it('parses in_progress tasks', () => {
    const content = '- [~] **Task 1.1**: Create structure';
    const tasks = parseTasksFile(content);

    expect(tasks[0].status).toBe('in_progress');
  });
});
```

### Component Test Examples

```typescript
// tests/components/PhaseProgress.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { PhaseProgress } from '../../src/components/PhaseProgress';

describe('PhaseProgress', () => {
  it('highlights current phase', () => {
    const { lastFrame } = render(
      <PhaseProgress
        currentPhase="design"
        completedPhases={['understand', 'research', 'scope']}
      />
    );

    // Current phase should be bracketed
    expect(lastFrame()).toContain('[4]');
  });

  it('shows completed phases in green', () => {
    const { lastFrame } = render(
      <PhaseProgress
        currentPhase="design"
        completedPhases={['understand', 'research', 'scope']}
      />
    );

    // This tests the rendered output contains the phase numbers
    // Color testing would require checking ANSI codes
    expect(lastFrame()).toContain('1');
    expect(lastFrame()).toContain('2');
    expect(lastFrame()).toContain('3');
  });
});
```

### E2E Test Examples

```typescript
// tests/e2e/workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TUI Workflow E2E', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temp project with test story
    tempDir = await mkdtemp(join(tmpdir(), 'tui-test-'));
    await mkdir(join(tempDir, 'docs/stories/test-story'), { recursive: true });

    await writeFile(
      join(tempDir, 'docs/stories/test-story/workflow-state.json'),
      JSON.stringify({
        story: "Test Story",
        slug: "test-story",
        source: "direct",
        currentPhase: "implement",
        completedPhases: ["understand", "research", "scope", "design", "decompose"],
        startedAt: new Date().toISOString()
      })
    );

    await writeFile(
      join(tempDir, 'docs/stories/test-story/tasks.md'),
      `# Tasks

- [ ] **Task 1.1**: First task
  - **Done when**: Test passes
`
    );
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('launches and displays story', async () => {
    // Launch TUI in non-interactive mode for testing
    const result = await execa('node', [
      './bin/ep-tui.js',
      '--project', tempDir,
      '--story', 'test-story',
      '--headless'  // Special test mode that exits after render
    ], {
      timeout: 5000
    });

    expect(result.stdout).toContain('test-story');
    expect(result.stdout).toContain('implement');
  });
});
```

## Key Decisions

### Decision 1: State Management - Zustand vs. React Context

**Context**: Need a way to share state across components (workflow state, tasks, process status, output buffer).

**Options Considered**:
1. **React Context + useReducer** - Built-in, no dependencies
   - Pros: No extra dependencies, familiar React patterns
   - Cons: Verbose boilerplate, re-render optimization needed
2. **Zustand** - Lightweight state management
   - Pros: Minimal API, TypeScript-friendly, works outside React, built-in selectors
   - Cons: Extra dependency (~2KB)
3. **Redux Toolkit** - Full-featured state management
   - Pros: Mature ecosystem, devtools
   - Cons: Overkill for this use case, larger bundle

**Decision**: Zustand

**Rationale**: Zustand provides the simplest API with excellent TypeScript support. It works outside React components (useful for services like ClaudeRunner), and its selector pattern prevents unnecessary re-renders. The tiny bundle size (~2KB) is negligible.

### Decision 2: Subprocess Library - execa vs. child_process

**Context**: Need to spawn Claude CLI and stream its output.

**Options Considered**:
1. **child_process (Node.js built-in)**
   - Pros: No dependency, always available
   - Cons: Callback-based API, manual promise wrapping
2. **execa**
   - Pros: Promise-based, better defaults, TypeScript types
   - Cons: Extra dependency (~40KB)

**Decision**: execa

**Rationale**: execa provides a cleaner Promise-based API, better default settings (like `FORCE_COLOR` environment handling), and TypeScript types out of the box. The dependency size is acceptable, and it matches modern Node.js patterns.

### Decision 3: File Watching - chokidar vs. fs.watch

**Context**: Need to watch `workflow-state.json` and `tasks.md` for changes.

**Options Considered**:
1. **fs.watch (Node.js built-in)**
   - Pros: No dependency
   - Cons: Inconsistent across platforms, missing features
2. **chokidar**
   - Pros: Consistent cross-platform, debouncing, better events
   - Cons: Extra dependency

**Decision**: chokidar

**Rationale**: `fs.watch` has known issues on macOS and Linux with event consistency. chokidar is the de facto standard for file watching in Node.js (used by Webpack, Vite, etc.) and provides reliable cross-platform behavior.

### Decision 4: Build Tool - tsup vs. esbuild vs. tsc

**Context**: Need to compile TypeScript to JavaScript for distribution.

**Options Considered**:
1. **tsc** - TypeScript compiler
   - Pros: Official, type checking
   - Cons: Slow, no bundling
2. **esbuild** - Fast bundler
   - Pros: Extremely fast
   - Cons: No type checking, manual config
3. **tsup** - Zero-config bundler (uses esbuild)
   - Pros: Fast (esbuild), zero config, type declaration generation
   - Cons: Smaller ecosystem than raw esbuild

**Decision**: tsup

**Rationale**: tsup provides the best of both worlds: esbuild's speed with sensible defaults and automatic TypeScript declaration generation. It's zero-config for common cases, which reduces maintenance burden.

### Decision 5: Fresh Context Pattern - Follow loop.sh

**Context**: How to spawn Claude for task execution.

**Options Considered**:
1. **Long-running session** - Keep one Claude process, send tasks via stdin
   - Pros: Faster task starts (no process spawn)
   - Cons: Context pollution, degrading quality over time
2. **Fresh process per task** - Spawn new Claude for each task (loop.sh pattern)
   - Pros: Zero context pollution, consistent quality
   - Cons: Process spawn overhead (~1s)

**Decision**: Fresh process per task

**Rationale**: The loop.sh script documents this pattern explicitly as the "Ralph Wiggum" insight: fresh context prevents error accumulation. Quality consistency is more important than the marginal time savings of reusing a process. This also matches the existing plugin's design philosophy.

### Decision 6: Pause Implementation - Stop Auto-Advance vs. Kill Process

**Context**: What happens when user presses 'p' to pause?

**Options Considered**:
1. **Kill current process** - Immediately terminate Claude
   - Pros: Immediate stop
   - Cons: Loses progress on current task, messy state
2. **Stop auto-advance** - Let current task complete, don't start next
   - Pros: Clean pause point, no lost work
   - Cons: Delay between press and actual pause

**Decision**: Stop auto-advance (let current task complete)

**Rationale**: Killing a task mid-execution leaves the codebase in an unknown state. It's cleaner to let the current task complete and simply not start the next one. The user can still force-quit with Ctrl+C if truly needed.

## Design Simulation

### Flow 1: User Launches TUI and Sees Dashboard

```
1. User runs: npx ep-tui --project /path/to/project

2. CLI parses arguments:
   - projectDir = "/path/to/project"
   - initialStory = undefined (not specified)

3. App component mounts:
   - Scans docs/stories/ directory
   - Finds stories: ["terminal-ui-implementation", "auth-feature"]
   - No initialStory provided -> shows StoryPicker

4. StoryPicker renders:
   +------------------------------------------+
   |  Select a Story                          |
   |  ----------------------------------------|
   |  > terminal-ui-implementation            |
   |    Phase: design (4/8) | Tasks: 0/0      |
   |    auth-feature                          |
   |    Phase: implement (6/8) | Tasks: 8/12  |
   |  ----------------------------------------|
   |  [Enter] Select  [Esc] Cancel            |
   +------------------------------------------+

5. User presses Down arrow -> auth-feature highlighted
6. User presses Enter -> loadStory("auth-feature") called
7. Dashboard renders with auth-feature story
```

### Flow 2: User Selects Story and Tasks Load

```
1. loadStory("auth-feature") called

2. FileWatcher service:
   - Reads docs/stories/auth-feature/workflow-state.json
   - Parses JSON into WorkflowState
   - Stores in Zustand: currentStory = {...}

3. TaskParser service:
   - Reads docs/stories/auth-feature/tasks.md
   - Parses markdown into Task[]
   - Stores in Zustand: tasks = [{id: "1.1", ...}, ...]

4. Dashboard re-renders:
   +------------------------------------------------------------------+
   |  Story: auth-feature         Phase: 6/8 (implement)              |
   |  Progress: 1 2 3 4 5 [6] 7 8                                     |
   |  Tasks:    ████████████░░░░ 66% (8/12)                           |
   +------------------+-----------------------------------------------+
   |  [x] 1.1 Setup   |                                               |
   |  [x] 1.2 Config  |  Ready to start workflow.                     |
   |  [x] 2.1 Model   |  Press [Enter] to begin or [s] for stories.   |
   |  [~] 2.2 API     |                                               |
   |  [ ] 2.3 Tests   |                                               |
   +------------------+-----------------------------------------------+
   |  [Enter] Start  [s]tory  [q]uit  [?]help                         |
   +------------------------------------------------------------------+

5. FileWatcher starts watching:
   - workflow-state.json for phase changes
   - tasks.md for task status changes
```

### Flow 3: User Starts Workflow and Claude Spawns

```
1. User presses Enter (or 'r' for run)

2. WorkflowOrchestrator.startWorkflow():
   - Sets store: isRunning = true, isPaused = false
   - Calls executeNextTask()

3. executeNextTask():
   - Gets next incomplete task: Task 2.2 (in_progress)
   - Sets store: activeTaskId = "2.2", taskStartTime = now()
   - Calls markTaskStatus("2.2", "in_progress")
   - Builds prompt with embedded context

4. ClaudeRunner.spawn(prompt):
   - Spawns: execa('claude', ['-p', prompt])
   - Attaches stdout/stderr handlers

5. Dashboard re-renders:
   +------------------------------------------------------------------+
   |  Story: auth-feature         Phase: 6/8 (implement)              |
   |  Progress: 1 2 3 4 5 [6] 7 8                                     |
   |  Tasks:    ████████████░░░░ 66% (8/12)                           |
   +------------------+-----------------------------------------------+
   |  [x] 1.1 Setup   |  > Starting Task 2.2: API endpoints           |
   |  [x] 1.2 Config  |                                               |
   |  [x] 2.1 Model   |  Reading design document...                   |
   |  [~] 2.2 API  <  |  Creating src/api/endpoints.ts...             |
   |  [ ] 2.3 Tests   |                                               |
   +------------------+-----------------------------------------------+
   |  [p]ause  [q]uit  [?]help              Task 2.2: 00:00:34        |
   +------------------------------------------------------------------+

6. Claude output streams:
   - onOutput callback fires with each chunk
   - store.appendOutput(chunk) called
   - OutputPanel auto-scrolls to bottom
```

### Flow 4: User Pauses Workflow

```
1. User presses 'p' while Claude is running

2. Keyboard handler in App.tsx:
   - Detects 'p' key
   - Calls store.pauseWorkflow()

3. pauseWorkflow():
   - Sets store: isPaused = true
   - Does NOT kill current process (let it complete)

4. Dashboard re-renders:
   +------------------------------------------------------------------+
   |  PAUSED                                                          |
   |  Story: auth-feature         Phase: 6/8 (implement)              |
   +------------------+-----------------------------------------------+
   |  [x] 1.1 Setup   |  > Workflow paused                            |
   |  [x] 1.2 Config  |                                               |
   |  [x] 2.1 Model   |  Current task (2.2) will complete, then       |
   |  [~] 2.2 API  <  |  workflow will wait for resume.               |
   |  [ ] 2.3 Tests   |                                               |
   +------------------+-----------------------------------------------+
   |  [r]esume  [q]uit  [?]help             Task 2.2: 00:02:15        |
   +------------------------------------------------------------------+

5. When Task 2.2 completes:
   - ClaudeRunner onExit fires
   - markTaskStatus("2.2", "complete")
   - isPaused is true -> does NOT call executeNextTask()
   - Output shows: "> Task 2.2 complete. Paused."

6. User presses 'r' to resume:
   - resumeWorkflow() called
   - Sets store: isPaused = false
   - Calls executeNextTask() for Task 2.3
```

### Flow 5: Phase Completes and Auto-Advances

```
1. Task 3.4 (final task in implement phase) completes

2. ClaudeRunner onExit fires:
   - Exit code 0 (success)
   - Run validation script

3. Validation passes:
   - markTaskStatus("3.4", "complete")
   - Check if all tasks complete -> YES

4. Phase completion detected:
   - Update workflow-state.json:
     currentPhase: "validate"
     completedPhases: [..., "implement"]

5. FileWatcher detects change:
   - Re-reads workflow-state.json
   - Updates store: currentStory.currentPhase = "validate"

6. Dashboard re-renders:
   +------------------------------------------------------------------+
   |  Story: auth-feature         Phase: 7/8 (validate)               |
   |  Progress: 1 2 3 4 5 6 [7] 8                                     |
   |  Tasks:    ████████████████ 100% (12/12)                         |
   +------------------+-----------------------------------------------+
   |  [x] 1.1 Setup   |  > All implementation tasks complete!         |
   |  [x] 1.2 Config  |                                               |
   |  [x] 2.1 Model   |  Phase 6 (implement) completed.               |
   |  [x] 2.2 API     |  Advanced to Phase 7 (validate).              |
   |  [x] 3.4 Final   |                                               |
   +------------------+-----------------------------------------------+
   |  [Enter] Continue validation  [s]tory  [q]uit                    |
   +------------------------------------------------------------------+

7. For delegated phases (validate), auto-start:
   - Spawn Claude with validation agent prompt
   - Continue streaming output
```

### Flow 6: All Phases Complete

```
1. Phase 8 (deploy) completes successfully

2. Workflow completion detected:
   - currentPhase: "complete" (or all 8 phases in completedPhases)

3. Dashboard renders completion state:
   +------------------------------------------------------------------+
   |  COMPLETE                                                        |
   |  Story: auth-feature                                             |
   |  Progress: 1 2 3 4 5 6 7 8 [*]                                   |
   +------------------+-----------------------------------------------+
   |                  |                                               |
   |  All phases      |  Workflow completed successfully!             |
   |  completed       |                                               |
   |                  |  Summary:                                     |
   |                  |  - 12 tasks completed                         |
   |                  |  - Total time: 2h 34m                         |
   |                  |  - All tests passing                          |
   |                  |                                               |
   +------------------+-----------------------------------------------+
   |  [s]tory (select another)  [q]uit                                |
   +------------------------------------------------------------------+

4. User can:
   - Press 's' to select another story
   - Press 'q' to quit
```

## Implementation Notes

### Terminal Compatibility

The TUI should gracefully handle:
- **Minimum terminal size**: 80x24 (fallback to simplified view)
- **Resize events**: Re-render layout on `SIGWINCH`
- **No truecolor**: Use 16-color ANSI codes for compatibility

### Error Handling

```typescript
// Graceful error boundaries
try {
  await orchestrator.executeNextTask();
} catch (error) {
  if (error.code === 'ENOENT') {
    store.appendOutput('Error: Claude CLI not found. Is it installed?');
  } else {
    store.appendOutput(`Error: ${error.message}`);
  }
  store.setRunning(false);
}
```

### Cleanup on Exit

```typescript
// Handle SIGINT/SIGTERM
process.on('SIGINT', () => {
  runner.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  runner.kill();
  process.exit(0);
});
```

### Environment Detection

```typescript
// Ensure Claude CLI is available before starting
async function checkDependencies(): Promise<boolean> {
  try {
    await execa('claude', ['--version']);
    return true;
  } catch {
    console.error('Claude CLI not found. Install it first.');
    return false;
  }
}
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude CLI not in PATH | Medium | High | Check on startup, show clear error |
| Large output buffer fills memory | Low | Medium | Ring buffer with 1000 line limit |
| File watch misses changes | Low | Medium | Poll fallback, manual refresh key |
| Terminal too small for layout | Medium | Low | Minimum size check, simplified view |
| Process zombie on crash | Low | Medium | Process cleanup on SIGINT/SIGTERM |
| Ink version incompatibility | Low | Low | Pin exact version, test on CI |

## Open Questions

- [x] TypeScript or JavaScript? -> **TypeScript** (type safety, better DX)
- [x] Build tooling? -> **tsup** (fast, zero-config)
- [x] Polling interval for workflow-state.json? -> **File watching with chokidar** (event-based, not polling)
- [x] Log scrollback limit? -> **1000 lines** (ring buffer)
- [x] Phase completion detection? -> **Watch workflow-state.json changes**
- [ ] Should TUI be published to npm? -> Design supports it, decision deferred
- [ ] Multi-story parallel execution? -> Out of scope for MVP, architecture supports future addition

## Dependencies Summary

```json
{
  "dependencies": {
    "ink": "^5.0.1",
    "react": "^18.3.1",
    "zustand": "^4.5.0",
    "execa": "^8.0.1",
    "chokidar": "^3.6.0",
    "meow": "^13.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.0.0",
    "vitest": "^1.6.0",
    "ink-testing-library": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0"
  }
}
```

## Next Steps

After design approval:
1. Create `packages/tui/` directory structure
2. Initialize package.json with dependencies
3. Set up TypeScript and build configuration
4. Implement core components following TDD
5. Add file watching and subprocess handling
6. Write comprehensive tests
7. Document CLI usage
