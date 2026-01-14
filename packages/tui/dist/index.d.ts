import { CLIOptions } from './cli.js';
import { ChildProcess } from 'node:child_process';

/**
 * App Component
 *
 * Root component that orchestrates the entire TUI application.
 *
 * Responsibilities:
 * - Initialize stores on mount
 * - Scan docs/stories/ for available stories
 * - Show StoryPicker if no initialStory provided
 * - Show Dashboard when a story is selected
 * - Show HelpModal on ? key
 * - Handle global keyboard input via useKeyboard hook
 * - Connect all hooks (useFileWatcher, useTimer)
 */

/**
 * Props for the App component.
 */
interface AppProps {
    /** Target project directory containing docs/stories/ */
    projectDir: string;
    /** Optional story slug to open directly */
    initialStory?: string;
    /** Headless mode for testing (renders once and exits) */
    headless?: boolean;
}

/**
 * Workflow Types
 *
 * Types for the engineering-process workflow state, matching the schema
 * defined in SKILL.md:72-87.
 */
/**
 * The 8 phases of the engineering process workflow.
 */
type Phase = 'understand' | 'research' | 'scope' | 'design' | 'decompose' | 'implement' | 'validate' | 'deploy';
/**
 * Jobs To Be Done (JTBD) context for understanding the user's goal.
 */
interface JTBD {
    context: string;
    job: string;
    outcome: string;
}
/**
 * Workflow state persisted in workflow-state.json.
 * Matches the schema exactly from SKILL.md:72-87.
 */
interface WorkflowState {
    /** Human-readable story title */
    story: string;
    /** URL-safe slug derived from story title */
    slug: string;
    /** Origin of the story: 'direct', 'github-issue', 'gitlab-issue' */
    source: string;
    /** Optional Jobs To Be Done context */
    jtbd?: JTBD;
    /** Current active phase */
    currentPhase: Phase;
    /** Array of completed phases */
    completedPhases: Phase[];
    /** ISO timestamp when workflow started */
    startedAt: string;
    /** ISO timestamp when workflow was paused (TUI extension) */
    pausedAt?: string;
    /** Reason for regression if workflow regressed to earlier phase */
    regressionReason?: string;
    /** Phase from which regression occurred */
    regressionFrom?: Phase;
    /** Artifacts invalidated by regression */
    invalidatedArtifacts?: string[];
}
/**
 * Summary information about a story for display in the picker.
 */
interface StoryInfo {
    /** URL-safe slug */
    slug: string;
    /** Human-readable title */
    title: string;
    /** Current phase */
    phase: Phase;
    /** Number of completed tasks */
    tasksComplete: number;
    /** Total number of tasks */
    tasksTotal: number;
    /** Last modification time */
    updatedAt: Date;
}

/**
 * Task Types
 *
 * Types for tasks parsed from tasks.md files.
 */
/**
 * Status of a task in the workflow.
 */
type TaskStatus = 'incomplete' | 'in_progress' | 'complete' | 'blocked';
/**
 * A task parsed from tasks.md.
 */
interface Task {
    /** Task identifier (e.g., "1.1", "2.3") */
    id: string;
    /** Task title/name */
    title: string;
    /** Current status of the task */
    status: TaskStatus;
    /** Detailed description of what the task involves */
    description?: string;
    /** Comma-separated list of files to modify */
    files?: string;
    /** Completion criteria ("Done when" clause) */
    criteria?: string;
    /** Comma-separated list of dependency task IDs (e.g., "1.1, 1.2") */
    dependencies?: string;
}

/**
 * UI Types
 *
 * Types for the TUI state management (Zustand store) and UI components.
 */

/**
 * Available views in the TUI.
 */
type View = 'picker' | 'dashboard' | 'help';
/**
 * Zustand store interface for the TUI.
 * Defines all state and actions for the application.
 */
interface TUIStore {
    /** List of available stories discovered in docs/stories/ */
    stories: StoryInfo[];
    /** Currently loaded workflow state, or null if none selected */
    currentStory: WorkflowState | null;
    /** Tasks parsed from tasks.md */
    tasks: Task[];
    /** ID of the task currently being executed by Claude */
    activeTaskId: string | null;
    /** Index of the task selected via keyboard navigation */
    selectedTaskIndex: number;
    /** Whether a workflow is currently running */
    isRunning: boolean;
    /** Whether the workflow is paused (won't auto-advance after current task) */
    isPaused: boolean;
    /** Output lines from Claude subprocess (ring buffer) */
    output: string[];
    /** Reference to the current Claude subprocess, or null */
    currentProcess: ChildProcess | null;
    /** Current view being displayed */
    view: View;
    /** Start time of the current task for elapsed time display */
    taskStartTime: Date | null;
    /** Load a story by its slug */
    loadStory: (slug: string) => Promise<void>;
    /** Refresh the list of available stories */
    refreshStories: () => Promise<void>;
    /** Create a new story with the given title, returns the slug */
    createStory: (title: string) => Promise<string>;
    /** Start the workflow from the current position */
    startWorkflow: () => Promise<void>;
    /** Pause the workflow (current task completes, no auto-advance) */
    pauseWorkflow: () => void;
    /** Resume the workflow from paused state */
    resumeWorkflow: () => Promise<void>;
    /** Start the engineering workflow (for stories with no tasks yet) */
    startEngineeringWorkflow: () => Promise<void>;
    /** Stop the workflow completely */
    stopWorkflow: () => void;
    /** Append text to the output buffer */
    appendOutput: (text: string) => void;
    /** Clear the output buffer */
    clearOutput: () => void;
    /** Select a task by index (keyboard navigation) */
    selectTask: (index: number) => void;
    /** Change the current view */
    setView: (view: View) => void;
}
/**
 * Keyboard hint for status bar display.
 */
interface KeyHint {
    /** Key to press (e.g., "p", "q") */
    key: string;
    /** Description of what the key does */
    label: string;
    /** Whether the key is currently active/available */
    enabled: boolean;
}

/**
 * Main entry point for the TUI.
 *
 * Exports the renderApp function that initializes and renders the Ink application.
 * Handles cleanup on exit (SIGINT, SIGTERM) including killing any running Claude processes.
 */

/**
 * Render the TUI application.
 *
 * @param options - CLI options from argument parsing
 */
declare function renderApp(options: CLIOptions): Promise<void>;

export { type AppProps, CLIOptions, type JTBD, type KeyHint, type Phase, type StoryInfo, type TUIStore, type Task, type TaskStatus, type View, type WorkflowState, renderApp };
