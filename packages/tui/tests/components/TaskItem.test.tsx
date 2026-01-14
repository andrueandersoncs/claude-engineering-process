/**
 * Unit tests for TaskItem component.
 *
 * Tests that TaskItem correctly renders task information with appropriate
 * status indicators and highlighting for active/selected states.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { TaskItem } from '../../src/components/TaskItem';
import type { Task } from '../../src/types';

// Helper to create test tasks
function createTask(
  id: string,
  title: string,
  status: Task['status'] = 'incomplete'
): Task {
  return { id, title, status };
}

describe('TaskItem', () => {
  describe('status indicators', () => {
    it('shows [ ] for incomplete tasks', () => {
      const task = createTask('1.1', 'Test task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('[ ]');
    });

    it('shows [x] for complete tasks', () => {
      const task = createTask('1.1', 'Test task', 'complete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('[x]');
    });

    it('shows [~] for in_progress tasks', () => {
      const task = createTask('1.1', 'Test task', 'in_progress');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('[~]');
    });

    it('shows [!] for blocked tasks', () => {
      const task = createTask('1.1', 'Test task', 'blocked');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('[!]');
    });
  });

  describe('task ID and title', () => {
    it('renders task ID', () => {
      const task = createTask('2.5', 'Test task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('2.5');
    });

    it('renders task title', () => {
      const task = createTask('1.1', 'My Test Task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('My Test Task');
    });

    it('truncates long titles with ellipsis', () => {
      const longTitle = 'This is a very long task title that should be truncated';
      const task = createTask('1.1', longTitle, 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} maxTitleWidth={20} />
      );
      const output = lastFrame() ?? '';
      expect(output).toContain('...');
      expect(output).not.toContain(longTitle);
    });

    it('does not truncate short titles', () => {
      const task = createTask('1.1', 'Short', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} maxTitleWidth={20} />
      );
      const output = lastFrame() ?? '';
      expect(output).toContain('Short');
      expect(output).not.toContain('...');
    });
  });

  describe('active highlighting', () => {
    it('shows active indicator when isActive is true', () => {
      const task = createTask('1.1', 'Active task', 'in_progress');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={true} isSelected={false} />
      );
      // Active tasks show "<" indicator
      expect(lastFrame()).toContain('<');
    });

    it('does not show active indicator when isActive is false', () => {
      const task = createTask('1.1', 'Inactive task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      // Should not have the active indicator at end
      const output = lastFrame() ?? '';
      // The < should not appear after the task
      expect(output.trim().endsWith('<')).toBe(false);
    });
  });

  describe('selected highlighting', () => {
    it('shows selection indicator when isSelected is true', () => {
      const task = createTask('1.1', 'Selected task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={true} />
      );
      // Selected tasks show ">" indicator
      expect(lastFrame()).toContain('>');
    });

    it('does not show selection indicator when isSelected is false', () => {
      const task = createTask('1.1', 'Not selected', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      const output = lastFrame() ?? '';
      // The > should not appear at the start
      expect(output.trim().startsWith('>')).toBe(false);
    });
  });

  describe('combined states', () => {
    it('shows both active and selected indicators', () => {
      const task = createTask('1.1', 'Active and selected', 'in_progress');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={true} isSelected={true} />
      );
      const output = lastFrame() ?? '';
      expect(output).toContain('>'); // selected
      expect(output).toContain('<'); // active
    });
  });

  describe('different task ID formats', () => {
    it('handles single digit IDs', () => {
      const task = createTask('1.1', 'Task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('1.1');
    });

    it('handles double digit phase IDs', () => {
      const task = createTask('10.1', 'Task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('10.1');
    });

    it('handles double digit task IDs', () => {
      const task = createTask('1.10', 'Task', 'incomplete');
      const { lastFrame } = render(
        <TaskItem task={task} isActive={false} isSelected={false} />
      );
      expect(lastFrame()).toContain('1.10');
    });
  });
});
