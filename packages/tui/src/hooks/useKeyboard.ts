/**
 * useKeyboard Hook
 *
 * Handles global keyboard input for the TUI application.
 * Uses Ink's useInput hook to capture key presses and dispatches
 * actions to the Zustand store.
 *
 * Key bindings:
 * - p: Pause workflow
 * - r: Resume workflow
 * - s: Open story picker
 * - n: Create new story (picker view)
 * - q: Quit application
 * - ?: Show help modal
 * - Enter: Start workflow / select story
 * - Up/Down arrows: Navigate task list / story list
 * - Escape: Cancel / close modal
 */

import { useCallback } from 'react';
import { useInput, useApp } from 'ink';
import type { View } from '../types';

/**
 * Options for the useKeyboard hook.
 */
export interface UseKeyboardOptions {
  /** Current view being displayed */
  view: View;
  /** Whether a workflow is currently running */
  isRunning: boolean;
  /** Whether the workflow is paused */
  isPaused: boolean;
  /** Number of tasks in the task list */
  taskCount: number;
  /** Current selected task index */
  selectedTaskIndex: number;
  /** Number of stories available */
  storyCount: number;
  /** Current selected story index (for story picker) */
  selectedStoryIndex: number;
  /** Callback to pause the workflow */
  onPause: () => void;
  /** Callback to resume the workflow */
  onResume: () => void;
  /** Callback to start the workflow */
  onStart: () => void;
  /** Callback to open story picker */
  onOpenStoryPicker: () => void;
  /** Callback to close story picker */
  onCloseStoryPicker: () => void;
  /** Callback to select a story */
  onSelectStory: (index: number) => void;
  /** Callback to confirm story selection */
  onConfirmStorySelection: () => void;
  /** Callback to create a new story */
  onCreateStory?: () => void;
  /** Callback to change the view */
  onSetView: (view: View) => void;
  /** Callback to select a task by index */
  onSelectTask: (index: number) => void;
  /** Whether the hook is enabled (can be disabled when needed) */
  enabled?: boolean;
}

/**
 * Return type for the useKeyboard hook.
 */
export interface UseKeyboardResult {
  /** No return values needed - hook manages side effects internally */
}

/**
 * Hook for handling global keyboard input.
 *
 * Captures key presses and dispatches appropriate actions based on:
 * - Current view (picker, dashboard, help)
 * - Workflow state (running, paused)
 *
 * @example
 * ```tsx
 * useKeyboard({
 *   view: 'dashboard',
 *   isRunning: false,
 *   isPaused: false,
 *   taskCount: 10,
 *   selectedTaskIndex: 0,
 *   storyCount: 3,
 *   selectedStoryIndex: 0,
 *   onPause: () => store.pauseWorkflow(),
 *   onResume: () => store.resumeWorkflow(),
 *   onStart: () => store.startWorkflow(),
 *   onOpenStoryPicker: () => store.setView('picker'),
 *   onCloseStoryPicker: () => store.setView('dashboard'),
 *   onSelectStory: (index) => setStoryIndex(index),
 *   onConfirmStorySelection: () => store.loadStory(selectedSlug),
 *   onSetView: (view) => store.setView(view),
 *   onSelectTask: (index) => store.selectTask(index),
 *   onCreateStory: () => setIsCreating(true),
 * });
 * ```
 */
export function useKeyboard({
  view,
  isRunning,
  isPaused,
  taskCount,
  selectedTaskIndex,
  storyCount,
  selectedStoryIndex,
  onPause,
  onResume,
  onStart,
  onOpenStoryPicker,
  onCloseStoryPicker,
  onSelectStory,
  onConfirmStorySelection,
  onCreateStory,
  onSetView,
  onSelectTask,
  enabled = true,
}: UseKeyboardOptions): UseKeyboardResult {
  const { exit } = useApp();

  /**
   * Handle navigation in task list (dashboard view).
   */
  const handleTaskNavigation = useCallback(
    (direction: 'up' | 'down') => {
      if (taskCount === 0) return;

      const newIndex =
        direction === 'up'
          ? Math.max(0, selectedTaskIndex - 1)
          : Math.min(taskCount - 1, selectedTaskIndex + 1);

      onSelectTask(newIndex);
    },
    [taskCount, selectedTaskIndex, onSelectTask]
  );

  /**
   * Handle navigation in story picker.
   */
  const handleStoryNavigation = useCallback(
    (direction: 'up' | 'down') => {
      if (storyCount === 0) return;

      const newIndex =
        direction === 'up'
          ? Math.max(0, selectedStoryIndex - 1)
          : Math.min(storyCount - 1, selectedStoryIndex + 1);

      onSelectStory(newIndex);
    },
    [storyCount, selectedStoryIndex, onSelectStory]
  );

  /**
   * Handle key input based on current view and state.
   */
  useInput(
    (input, key) => {
      // Handle help modal - only Escape to close
      if (view === 'help') {
        if (key.escape || input === '?') {
          onSetView('dashboard');
        }
        return;
      }

      // Handle story picker
      if (view === 'picker') {
        // Navigation
        if (key.upArrow) {
          handleStoryNavigation('up');
          return;
        }
        if (key.downArrow) {
          handleStoryNavigation('down');
          return;
        }

        // Selection
        if (key.return) {
          onConfirmStorySelection();
          return;
        }

        // Cancel
        if (key.escape) {
          onCloseStoryPicker();
          return;
        }

        // Quit still works in picker
        if (input === 'q') {
          exit();
          return;
        }

        // Create new story
        if (input === 'n' && onCreateStory) {
          onCreateStory();
          return;
        }

        return;
      }

      // Handle dashboard view
      if (view === 'dashboard') {
        // Navigation - up/down arrows
        if (key.upArrow) {
          handleTaskNavigation('up');
          return;
        }
        if (key.downArrow) {
          handleTaskNavigation('down');
          return;
        }

        // Pause workflow (only when running and not paused)
        if (input === 'p' && isRunning && !isPaused) {
          onPause();
          return;
        }

        // Resume workflow (when paused or to start)
        if (input === 'r') {
          if (isPaused) {
            onResume();
          } else if (!isRunning) {
            onStart();
          }
          return;
        }

        // Start workflow (Enter when not running)
        if (key.return && !isRunning) {
          onStart();
          return;
        }

        // Open story picker
        if (input === 's') {
          onOpenStoryPicker();
          return;
        }

        // Show help
        if (input === '?') {
          onSetView('help');
          return;
        }

        // Quit application
        if (input === 'q') {
          exit();
          return;
        }
      }
    },
    { isActive: enabled }
  );

  return {};
}
