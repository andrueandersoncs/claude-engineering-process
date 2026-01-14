/**
 * UI Types
 *
 * Types for the TUI state management (Zustand store) and UI components.
 */

import type { ChildProcess } from 'node:child_process';
import type { StoryInfo, WorkflowState } from './workflow';
import type { Task } from './task';

/**
 * Available views in the TUI.
 */
export type View = 'picker' | 'dashboard' | 'help';

/**
 * Zustand store interface for the TUI.
 * Defines all state and actions for the application.
 */
export interface TUIStore {
  // ─────────────────────────────────────────────────────────────────
  // Story State
  // ─────────────────────────────────────────────────────────────────

  /** List of available stories discovered in docs/stories/ */
  stories: StoryInfo[];
  /** Currently loaded workflow state, or null if none selected */
  currentStory: WorkflowState | null;

  // ─────────────────────────────────────────────────────────────────
  // Task State
  // ─────────────────────────────────────────────────────────────────

  /** Tasks parsed from tasks.md */
  tasks: Task[];
  /** ID of the task currently being executed by Claude */
  activeTaskId: string | null;
  /** Index of the task selected via keyboard navigation */
  selectedTaskIndex: number;

  // ─────────────────────────────────────────────────────────────────
  // Process State
  // ─────────────────────────────────────────────────────────────────

  /** Whether a workflow is currently running */
  isRunning: boolean;
  /** Whether the workflow is paused (won't auto-advance after current task) */
  isPaused: boolean;
  /** Output lines from Claude subprocess (ring buffer) */
  output: string[];
  /** Reference to the current Claude subprocess, or null */
  currentProcess: ChildProcess | null;

  // ─────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────

  /** Current view being displayed */
  view: View;

  // ─────────────────────────────────────────────────────────────────
  // Timing
  // ─────────────────────────────────────────────────────────────────

  /** Start time of the current task for elapsed time display */
  taskStartTime: Date | null;

  // ─────────────────────────────────────────────────────────────────
  // Actions - Story
  // ─────────────────────────────────────────────────────────────────

  /** Load a story by its slug */
  loadStory: (slug: string) => Promise<void>;
  /** Refresh the list of available stories */
  refreshStories: () => Promise<void>;
  /** Create a new story with the given title, returns the slug */
  createStory: (title: string) => Promise<string>;

  // ─────────────────────────────────────────────────────────────────
  // Actions - Workflow
  // ─────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────
  // Actions - Output
  // ─────────────────────────────────────────────────────────────────

  /** Append text to the output buffer */
  appendOutput: (text: string) => void;
  /** Clear the output buffer */
  clearOutput: () => void;

  // ─────────────────────────────────────────────────────────────────
  // Actions - Navigation
  // ─────────────────────────────────────────────────────────────────

  /** Select a task by index (keyboard navigation) */
  selectTask: (index: number) => void;
  /** Change the current view */
  setView: (view: View) => void;
}

/**
 * Keyboard hint for status bar display.
 */
export interface KeyHint {
  /** Key to press (e.g., "p", "q") */
  key: string;
  /** Description of what the key does */
  label: string;
  /** Whether the key is currently active/available */
  enabled: boolean;
}
