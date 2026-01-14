/**
 * Unit tests for store selectors.
 */

import { describe, it, expect } from 'vitest';
import {
  selectCompletedCount,
  selectProgress,
  selectNextTask,
  selectCurrentPhaseIndex,
} from '../../src/store/selectors';
import type { TUIStore } from '../../src/types';
import type { Task } from '../../src/types';

// Helper to create minimal state for testing
function createMockState(overrides: Partial<TUIStore> = {}): TUIStore {
  return {
    stories: [],
    currentStory: null,
    tasks: [],
    activeTaskId: null,
    selectedTaskIndex: 0,
    isRunning: false,
    isPaused: false,
    output: [],
    currentProcess: null,
    view: 'picker',
    taskStartTime: null,
    loadStory: async () => {},
    refreshStories: async () => {},
    startWorkflow: async () => {},
    pauseWorkflow: () => {},
    resumeWorkflow: async () => {},
    appendOutput: () => {},
    clearOutput: () => {},
    selectTask: () => {},
    setView: () => {},
    ...overrides,
  };
}

// Helper to create a task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1.1',
    title: 'Test Task',
    status: 'incomplete',
    ...overrides,
  };
}

describe('selectCompletedCount', () => {
  it('returns 0 for empty task list', () => {
    const state = createMockState({ tasks: [] });
    expect(selectCompletedCount(state)).toBe(0);
  });

  it('returns 0 when no tasks are complete', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'incomplete' }),
        createTask({ id: '1.2', status: 'in_progress' }),
      ],
    });
    expect(selectCompletedCount(state)).toBe(0);
  });

  it('returns count of complete tasks', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'complete' }),
        createTask({ id: '1.3', status: 'incomplete' }),
        createTask({ id: '1.4', status: 'in_progress' }),
      ],
    });
    expect(selectCompletedCount(state)).toBe(2);
  });

  it('counts all complete tasks', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'complete' }),
        createTask({ id: '1.3', status: 'complete' }),
      ],
    });
    expect(selectCompletedCount(state)).toBe(3);
  });
});

describe('selectProgress', () => {
  it('returns 0 for empty task list', () => {
    const state = createMockState({ tasks: [] });
    expect(selectProgress(state)).toBe(0);
  });

  it('returns 0 when no tasks are complete', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'incomplete' }),
        createTask({ id: '1.2', status: 'incomplete' }),
      ],
    });
    expect(selectProgress(state)).toBe(0);
  });

  it('returns 50 when half tasks are complete', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'incomplete' }),
      ],
    });
    expect(selectProgress(state)).toBe(50);
  });

  it('returns 100 when all tasks are complete', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'complete' }),
      ],
    });
    expect(selectProgress(state)).toBe(100);
  });

  it('returns correct percentage for partial completion', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'complete' }),
        createTask({ id: '1.3', status: 'complete' }),
        createTask({ id: '1.4', status: 'incomplete' }),
      ],
    });
    expect(selectProgress(state)).toBe(75);
  });

  it('rounds down fractional percentages', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'incomplete' }),
        createTask({ id: '1.3', status: 'incomplete' }),
      ],
    });
    // 1/3 = 33.33...%, should round down to 33
    expect(selectProgress(state)).toBe(33);
  });
});

describe('selectNextTask', () => {
  it('returns null for empty task list', () => {
    const state = createMockState({ tasks: [] });
    expect(selectNextTask(state)).toBeNull();
  });

  it('returns null when all tasks are complete', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'complete' }),
      ],
    });
    expect(selectNextTask(state)).toBeNull();
  });

  it('returns first incomplete task', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'incomplete' }),
        createTask({ id: '1.3', status: 'incomplete' }),
      ],
    });
    const nextTask = selectNextTask(state);
    expect(nextTask).not.toBeNull();
    expect(nextTask?.id).toBe('1.2');
  });

  it('returns in_progress task before incomplete tasks', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'in_progress' }),
        createTask({ id: '1.3', status: 'incomplete' }),
      ],
    });
    const nextTask = selectNextTask(state);
    expect(nextTask).not.toBeNull();
    expect(nextTask?.id).toBe('1.2');
  });

  it('returns first incomplete if no in_progress tasks', () => {
    const state = createMockState({
      tasks: [
        createTask({ id: '1.1', status: 'complete' }),
        createTask({ id: '1.2', status: 'incomplete' }),
      ],
    });
    const nextTask = selectNextTask(state);
    expect(nextTask?.id).toBe('1.2');
  });
});

describe('selectCurrentPhaseIndex', () => {
  it('returns 1 for understand phase', () => {
    const state = createMockState({
      currentStory: {
        story: 'Test',
        slug: 'test',
        source: 'direct',
        currentPhase: 'understand',
        completedPhases: [],
        startedAt: new Date().toISOString(),
      },
    });
    expect(selectCurrentPhaseIndex(state)).toBe(1);
  });

  it('returns 2 for research phase', () => {
    const state = createMockState({
      currentStory: {
        story: 'Test',
        slug: 'test',
        source: 'direct',
        currentPhase: 'research',
        completedPhases: ['understand'],
        startedAt: new Date().toISOString(),
      },
    });
    expect(selectCurrentPhaseIndex(state)).toBe(2);
  });

  it('returns 6 for implement phase', () => {
    const state = createMockState({
      currentStory: {
        story: 'Test',
        slug: 'test',
        source: 'direct',
        currentPhase: 'implement',
        completedPhases: ['understand', 'research', 'scope', 'design', 'decompose'],
        startedAt: new Date().toISOString(),
      },
    });
    expect(selectCurrentPhaseIndex(state)).toBe(6);
  });

  it('returns 7 for validate phase', () => {
    const state = createMockState({
      currentStory: {
        story: 'Test',
        slug: 'test',
        source: 'direct',
        currentPhase: 'validate',
        completedPhases: ['understand', 'research', 'scope', 'design', 'decompose', 'implement'],
        startedAt: new Date().toISOString(),
      },
    });
    expect(selectCurrentPhaseIndex(state)).toBe(7);
  });

  it('returns 0 when no story is loaded', () => {
    const state = createMockState({ currentStory: null });
    expect(selectCurrentPhaseIndex(state)).toBe(0);
  });
});
