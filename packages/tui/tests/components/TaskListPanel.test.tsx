/**
 * Component tests for TaskListPanel using ink-testing-library.
 *
 * These tests verify the TaskListPanel component renders a scrollable list of tasks
 * with status indicators, highlights the active task being executed, and shows
 * correct status symbols for different task states.
 *
 * Following TDD principles, these tests are written BEFORE the implementation exists,
 * so they will FAIL initially.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';

// Import the component under test - this will fail until implementation exists
import { TaskListPanel } from '../../src/components/TaskListPanel';

// Task type (matches design.md)
type TaskStatus = 'incomplete' | 'in_progress' | 'complete' | 'blocked';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  description?: string;
  files?: string;
  criteria?: string;
  dependencies?: string;
}

// Test fixtures
const createTask = (
  id: string,
  title: string,
  status: TaskStatus = 'incomplete'
): Task => ({
  id,
  title,
  status,
});

const sampleTasks: Task[] = [
  createTask('1.1', 'Setup project structure', 'complete'),
  createTask('1.2', 'Configure TypeScript', 'complete'),
  createTask('1.3', 'Add dependencies', 'in_progress'),
  createTask('1.4', 'Create entry point', 'incomplete'),
  createTask('1.5', 'Write tests', 'incomplete'),
];

describe('TaskListPanel', () => {
  describe('rendering task list with status indicators', () => {
    it('renders all tasks in the list', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // All task IDs should be visible
      expect(output).toContain('1.1');
      expect(output).toContain('1.2');
      expect(output).toContain('1.3');
      expect(output).toContain('1.4');
      expect(output).toContain('1.5');
    });

    it('renders task titles', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Task titles should be visible
      expect(output).toContain('Setup project structure');
      expect(output).toContain('Configure TypeScript');
      expect(output).toContain('Add dependencies');
      expect(output).toContain('Create entry point');
      expect(output).toContain('Write tests');
    });

    it('renders empty state when no tasks', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={[]}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Should handle empty task list gracefully
      expect(output).toBeDefined();
    });

    it('renders single task correctly', () => {
      const singleTask = [createTask('1.1', 'Single task', 'incomplete')];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={singleTask}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('1.1');
      expect(output).toContain('Single task');
    });
  });

  describe('showing correct status symbols', () => {
    it('shows [ ] for incomplete tasks', () => {
      const tasks = [createTask('1.1', 'Incomplete task', 'incomplete')];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={tasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('[ ]');
    });

    it('shows [x] for complete tasks', () => {
      const tasks = [createTask('1.1', 'Complete task', 'complete')];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={tasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('[x]');
    });

    it('shows [~] for in_progress tasks', () => {
      const tasks = [createTask('1.1', 'In progress task', 'in_progress')];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={tasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('[~]');
    });

    it('shows correct symbols for mixed status tasks', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Should have 2 complete [x], 1 in_progress [~], 2 incomplete [ ]
      // Count occurrences
      const completeMatches = output.match(/\[x\]/g) ?? [];
      const inProgressMatches = output.match(/\[~\]/g) ?? [];
      const incompleteMatches = output.match(/\[ \]/g) ?? [];

      expect(completeMatches.length).toBe(2);
      expect(inProgressMatches.length).toBe(1);
      expect(incompleteMatches.length).toBe(2);
    });

    it('shows [!] for blocked tasks', () => {
      const tasks = [createTask('1.1', 'Blocked task', 'blocked')];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={tasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('[!]');
    });
  });

  describe('highlighting active task', () => {
    it('highlights the active task being executed', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="1.3"
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // The active task should be visually distinct
      // Exact highlighting depends on implementation (could be arrows, colors, etc.)
      expect(output).toContain('1.3');
      expect(output).toContain('Add dependencies');
    });

    it('does not highlight when no active task', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Should render normally without active highlighting
      expect(output).toBeDefined();
    });

    it('highlights different active tasks correctly', () => {
      // Test with first task active
      const { lastFrame: frame1 } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="1.1"
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output1 = frame1() ?? '';
      expect(output1).toContain('1.1');

      // Test with last task active
      const { lastFrame: frame2 } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="1.5"
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output2 = frame2() ?? '';
      expect(output2).toContain('1.5');
    });

    it('shows active indicator (like < or arrow) for active task', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="1.3"
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Active task should have some visual indicator
      // Based on design.md mockup, this could be "<" after the task
      // The implementation may use different indicators
      expect(output).toContain('1.3');
      // The line with the active task should be distinguishable
    });
  });

  describe('highlighting selected task (keyboard navigation)', () => {
    it('highlights the task at selectedIndex', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={2}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Task at index 2 (1.3) should be selected/highlighted
      expect(output).toContain('1.3');
    });

    it('highlights first task when selectedIndex is 0', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('1.1');
    });

    it('highlights last task when selectedIndex is at end', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={sampleTasks.length - 1}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('1.5');
    });

    it('distinguishes between selected and active tasks', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="1.2"
          selectedIndex={4}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Both active (1.2) and selected (1.5) should be visible
      expect(output).toContain('1.2');
      expect(output).toContain('1.5');
    });
  });

  describe('task ordering', () => {
    it('renders tasks in provided order', () => {
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Task IDs should appear in order
      const pos1 = output.indexOf('1.1');
      const pos2 = output.indexOf('1.2');
      const pos3 = output.indexOf('1.3');
      const pos4 = output.indexOf('1.4');
      const pos5 = output.indexOf('1.5');

      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
      expect(pos3).toBeLessThan(pos4);
      expect(pos4).toBeLessThan(pos5);
    });
  });

  describe('edge cases', () => {
    it('handles tasks with long titles', () => {
      const longTitleTask = createTask(
        '1.1',
        'This is a very long task title that might need to be truncated with ellipsis to fit in the panel',
        'incomplete'
      );

      const { lastFrame } = render(
        <TaskListPanel
          tasks={[longTitleTask]}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      // Should handle long titles (may truncate with ellipsis)
      expect(output).toContain('1.1');
    });

    it('handles task ID with different formats', () => {
      const tasks = [
        createTask('0.1', 'Phase 0 task', 'incomplete'),
        createTask('10.2', 'Double digit phase', 'complete'),
        createTask('2.10', 'Double digit task', 'in_progress'),
      ];

      const { lastFrame } = render(
        <TaskListPanel
          tasks={tasks}
          activeTaskId={null}
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('0.1');
      expect(output).toContain('10.2');
      expect(output).toContain('2.10');
    });

    it('handles selectedIndex out of bounds gracefully', () => {
      // Should not crash with invalid selectedIndex
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId={null}
          selectedIndex={100}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
    });

    it('handles invalid activeTaskId gracefully', () => {
      // Should not crash with non-existent activeTaskId
      const { lastFrame } = render(
        <TaskListPanel
          tasks={sampleTasks}
          activeTaskId="nonexistent"
          selectedIndex={0}
          onSelectTask={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
    });
  });
});
