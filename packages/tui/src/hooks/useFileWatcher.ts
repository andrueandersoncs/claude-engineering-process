/**
 * useFileWatcher Hook
 *
 * React hook that sets up file watching for story files on mount.
 * Watches workflow-state.json and tasks.md for changes and updates
 * the store accordingly.
 *
 * The hook:
 * - Starts watching when a story is loaded
 * - Stops watching on unmount or story change
 * - Re-parses tasks.md on change
 * - Re-loads workflow-state.json on change
 */

import { useEffect, useRef, useCallback } from 'react';
import { join } from 'path';
import { createFileWatcher } from '../services/fileWatcher';
import type { FileWatcher } from '../services/fileWatcher';
import { parseTasksFile } from '../services/taskParser';
import { readFileSafe, readJsonSafe, getStoryDir } from '../utils/files';
import type { WorkflowState, Task } from '../types';

/**
 * Options for the useFileWatcher hook.
 */
export interface UseFileWatcherOptions {
  /** Project directory path */
  projectDir: string;
  /** Current story slug (null if no story selected) */
  storySlug: string | null;
  /** Callback when workflow state changes */
  onWorkflowChange: (state: WorkflowState) => void;
  /** Callback when tasks change */
  onTasksChange: (tasks: Task[]) => void;
  /** Whether file watching is enabled */
  enabled?: boolean;
}

/**
 * Result from the useFileWatcher hook.
 */
export interface UseFileWatcherResult {
  /** Whether the watcher is currently active */
  isWatching: boolean;
}

/**
 * Hook for watching story files and updating state on changes.
 *
 * Sets up chokidar-based file watching for workflow-state.json and tasks.md.
 * Automatically starts watching when a story is selected and stops on
 * unmount or when the story changes.
 *
 * @example
 * ```tsx
 * const { isWatching } = useFileWatcher({
 *   projectDir: '/path/to/project',
 *   storySlug: 'my-story',
 *   onWorkflowChange: (state) => store.setCurrentStory(state),
 *   onTasksChange: (tasks) => store.setTasks(tasks),
 * });
 * ```
 */
export function useFileWatcher({
  projectDir,
  storySlug,
  onWorkflowChange,
  onTasksChange,
  enabled = true,
}: UseFileWatcherOptions): UseFileWatcherResult {
  // Keep a ref to the file watcher instance
  const watcherRef = useRef<FileWatcher | null>(null);

  // Track watching state for return value
  const isWatchingRef = useRef<boolean>(false);

  /**
   * Handle workflow-state.json file change.
   * Re-reads and parses the file, then calls the callback.
   */
  const handleWorkflowChange = useCallback(() => {
    if (!storySlug || !projectDir) return;

    const storyDir = getStoryDir(projectDir, storySlug);
    const workflowStatePath = join(storyDir, 'workflow-state.json');
    const workflowState = readJsonSafe<WorkflowState>(workflowStatePath);

    if (workflowState) {
      onWorkflowChange(workflowState);
    }
  }, [projectDir, storySlug, onWorkflowChange]);

  /**
   * Handle tasks.md file change.
   * Re-reads and parses the file, then calls the callback.
   */
  const handleTasksChange = useCallback(() => {
    if (!storySlug || !projectDir) return;

    const storyDir = getStoryDir(projectDir, storySlug);
    const tasksPath = join(storyDir, 'tasks.md');
    const tasksContent = readFileSafe(tasksPath);
    const tasks = tasksContent ? parseTasksFile(tasksContent) : [];

    onTasksChange(tasks);
  }, [projectDir, storySlug, onTasksChange]);

  /**
   * Set up file watching when story changes or on mount.
   */
  useEffect(() => {
    // Clean up any existing watcher
    if (watcherRef.current) {
      watcherRef.current.stop();
      watcherRef.current = null;
      isWatchingRef.current = false;
    }

    // Don't start if disabled or no story selected
    if (!enabled || !storySlug || !projectDir) {
      return;
    }

    // Create new watcher
    const watcher = createFileWatcher();
    watcherRef.current = watcher;

    // Register callbacks
    watcher.onWorkflowChange(handleWorkflowChange);
    watcher.onTasksChange(handleTasksChange);

    // Start watching the story directory
    const storyDir = getStoryDir(projectDir, storySlug);
    watcher.watch(storyDir);
    isWatchingRef.current = true;

    // Cleanup function
    return () => {
      if (watcherRef.current) {
        watcherRef.current.stop();
        watcherRef.current = null;
        isWatchingRef.current = false;
      }
    };
  }, [projectDir, storySlug, enabled, handleWorkflowChange, handleTasksChange]);

  return {
    isWatching: isWatchingRef.current,
  };
}
