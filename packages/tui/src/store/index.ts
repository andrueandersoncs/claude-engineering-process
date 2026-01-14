/**
 * Zustand Store
 *
 * Central state management for the TUI application.
 * Manages story state, task state, process state, UI state, and timing.
 */

import { create } from 'zustand';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import type { TUIStore, View, StoryInfo, WorkflowState, Task } from '../types';
import {
  readJsonSafe,
  readFileSafe,
  listSubdirectories,
  getStoryDir,
  getModifiedTime,
} from '../utils/files';
import { parseTasksFile } from '../services/taskParser';
import { slugify, ensureUniqueSlug } from '../utils/slugify';

/** Maximum number of output lines to keep in the ring buffer */
const MAX_OUTPUT_LINES = 1000;

/** Project directory - set via setProjectDir before using the store */
let projectDir: string = process.cwd();

/**
 * Sets the project directory for the store.
 * Must be called before using loadStory or refreshStories.
 */
export function setProjectDir(dir: string): void {
  projectDir = dir;
}

/**
 * Gets the current project directory.
 */
export function getProjectDir(): string {
  return projectDir;
}

/**
 * Discovers all stories in the docs/stories/ directory.
 */
function discoverStories(): StoryInfo[] {
  const storiesDir = join(projectDir, 'docs', 'stories');
  const slugs = listSubdirectories(storiesDir);

  const stories: StoryInfo[] = [];
  for (const slug of slugs) {
    const storyDir = getStoryDir(projectDir, slug);
    const workflowStatePath = join(storyDir, 'workflow-state.json');
    const tasksPath = join(storyDir, 'tasks.md');

    // Read workflow state
    const workflowState = readJsonSafe<WorkflowState>(workflowStatePath);
    if (!workflowState) {
      continue; // Skip directories without valid workflow-state.json
    }

    // Read tasks for counts
    const tasksContent = readFileSafe(tasksPath);
    const tasks = tasksContent ? parseTasksFile(tasksContent) : [];
    const tasksComplete = tasks.filter((t) => t.status === 'complete').length;
    const tasksTotal = tasks.length;

    // Get modification time
    const updatedAt = getModifiedTime(workflowStatePath) ?? new Date();

    stories.push({
      slug,
      title: workflowState.story,
      phase: workflowState.currentPhase,
      tasksComplete,
      tasksTotal,
      updatedAt,
    });
  }

  // Sort by most recently modified first
  stories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return stories;
}

/**
 * Loads a story by its slug.
 */
function loadStoryBySlug(slug: string): {
  workflowState: WorkflowState | null;
  tasks: Task[];
} {
  const storyDir = getStoryDir(projectDir, slug);
  const workflowStatePath = join(storyDir, 'workflow-state.json');
  const tasksPath = join(storyDir, 'tasks.md');

  const workflowState = readJsonSafe<WorkflowState>(workflowStatePath);
  const tasksContent = readFileSafe(tasksPath);
  const tasks = tasksContent ? parseTasksFile(tasksContent) : [];

  return { workflowState, tasks };
}

/**
 * Creates the Zustand store with all state slices and actions.
 */
export const useTUIStore = create<TUIStore>((set, get) => ({
  // ─────────────────────────────────────────────────────────────────
  // Story State
  // ─────────────────────────────────────────────────────────────────

  stories: [],
  currentStory: null,

  // ─────────────────────────────────────────────────────────────────
  // Task State
  // ─────────────────────────────────────────────────────────────────

  tasks: [],
  activeTaskId: null,
  selectedTaskIndex: 0,

  // ─────────────────────────────────────────────────────────────────
  // Process State
  // ─────────────────────────────────────────────────────────────────

  isRunning: false,
  isPaused: false,
  output: [],
  currentProcess: null,

  // ─────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────

  view: 'picker' as View,

  // ─────────────────────────────────────────────────────────────────
  // Timing
  // ─────────────────────────────────────────────────────────────────

  taskStartTime: null,

  // ─────────────────────────────────────────────────────────────────
  // Actions - Story
  // ─────────────────────────────────────────────────────────────────

  loadStory: async (slug: string): Promise<void> => {
    const { workflowState, tasks } = loadStoryBySlug(slug);

    if (workflowState) {
      set({
        currentStory: workflowState,
        tasks,
        selectedTaskIndex: 0,
        activeTaskId: null,
        output: [],
        isRunning: false,
        isPaused: false,
        taskStartTime: null,
        view: 'dashboard',
      });
    }
  },

  refreshStories: async (): Promise<void> => {
    const stories = discoverStories();
    set({ stories });
  },

  createStory: async (title: string): Promise<string> => {
    // Generate unique slug
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
  },

  // ─────────────────────────────────────────────────────────────────
  // Actions - Workflow
  // ─────────────────────────────────────────────────────────────────

  startWorkflow: async (): Promise<void> => {
    const { tasks } = get();

    // Find the first incomplete task
    const nextTask = tasks.find(
      (t) => t.status === 'incomplete' || t.status === 'in_progress'
    );

    if (nextTask) {
      set({
        isRunning: true,
        isPaused: false,
        activeTaskId: nextTask.id,
        taskStartTime: new Date(),
      });
    }
  },

  pauseWorkflow: (): void => {
    set({ isPaused: true });
  },

  resumeWorkflow: async (): Promise<void> => {
    const { isRunning, tasks } = get();

    set({ isPaused: false });

    // If not currently running a task, start the next one
    if (!isRunning) {
      const nextTask = tasks.find(
        (t) => t.status === 'incomplete' || t.status === 'in_progress'
      );

      if (nextTask) {
        set({
          isRunning: true,
          activeTaskId: nextTask.id,
          taskStartTime: new Date(),
        });
      }
    }
  },

  startEngineeringWorkflow: async (): Promise<void> => {
    // Set running state - the actual Claude process will be spawned by the App
    // component which manages the ClaudeRunner instance
    set({
      isRunning: true,
      isPaused: false,
      activeTaskId: null, // No specific task - running the full workflow
      taskStartTime: new Date(),
    });
  },

  stopWorkflow: (): void => {
    set({
      isRunning: false,
      isPaused: false,
      activeTaskId: null,
      taskStartTime: null,
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // Actions - Output
  // ─────────────────────────────────────────────────────────────────

  appendOutput: (text: string): void => {
    set((state) => {
      // Split text into lines, preserving partial lines
      const newLines = text.split('\n');
      let updatedOutput = [...state.output];

      // If there's existing output and the text doesn't start with newline,
      // append to the last line
      if (updatedOutput.length > 0 && !text.startsWith('\n')) {
        const lastIndex = updatedOutput.length - 1;
        const firstNewLine = newLines[0];
        if (firstNewLine !== undefined && updatedOutput[lastIndex] !== undefined) {
          updatedOutput[lastIndex] += firstNewLine;
        }
        newLines.shift();
      }

      // Add remaining lines
      updatedOutput = [...updatedOutput, ...newLines];

      // Enforce ring buffer limit
      if (updatedOutput.length > MAX_OUTPUT_LINES) {
        updatedOutput = updatedOutput.slice(-MAX_OUTPUT_LINES);
      }

      return { output: updatedOutput };
    });
  },

  clearOutput: (): void => {
    set({ output: [] });
  },

  // ─────────────────────────────────────────────────────────────────
  // Actions - Navigation
  // ─────────────────────────────────────────────────────────────────

  selectTask: (index: number): void => {
    const { tasks } = get();
    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, tasks.length - 1));
    set({ selectedTaskIndex: clampedIndex });
  },

  setView: (view: View): void => {
    set({ view });
  },
}));

/**
 * Re-export the store type for consumers.
 */
export type { TUIStore };

/**
 * Re-export selectors for derived state.
 */
export {
  selectCompletedCount,
  selectProgress,
  selectNextTask,
  selectCurrentPhaseIndex,
} from './selectors';
