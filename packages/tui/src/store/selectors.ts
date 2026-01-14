/**
 * Store Selectors
 *
 * Derived selectors for computed state like progress percentage, next task, etc.
 * These selectors take the TUIStore state and return computed values.
 */

import type { TUIStore, Task } from '../types';
import { PHASES } from '../utils/constants';

/**
 * Returns the count of completed tasks.
 */
export function selectCompletedCount(state: TUIStore): number {
  return state.tasks.filter((task) => task.status === 'complete').length;
}

/**
 * Returns the progress percentage (0-100) based on completed tasks.
 * Returns 0 if there are no tasks.
 */
export function selectProgress(state: TUIStore): number {
  const total = state.tasks.length;
  if (total === 0) {
    return 0;
  }
  const completed = selectCompletedCount(state);
  return Math.floor((completed / total) * 100);
}

/**
 * Returns the next task to work on.
 * Prioritizes in_progress tasks, then returns the first incomplete task.
 * Returns null if all tasks are complete or there are no tasks.
 */
export function selectNextTask(state: TUIStore): Task | null {
  // First check for in_progress tasks
  const inProgressTask = state.tasks.find((task) => task.status === 'in_progress');
  if (inProgressTask) {
    return inProgressTask;
  }

  // Then check for incomplete tasks
  const incompleteTask = state.tasks.find((task) => task.status === 'incomplete');
  return incompleteTask ?? null;
}

/**
 * Returns the 1-indexed phase number (1-7) for the current phase.
 * Returns 0 if no story is loaded.
 */
export function selectCurrentPhaseIndex(state: TUIStore): number {
  if (!state.currentStory) {
    return 0;
  }
  const phaseIndex = PHASES.indexOf(state.currentStory.currentPhase);
  // Return 1-indexed (1-7), or 0 if not found
  return phaseIndex === -1 ? 0 : phaseIndex + 1;
}
