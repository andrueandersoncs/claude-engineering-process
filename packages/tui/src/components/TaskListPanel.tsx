/**
 * TaskListPanel component - renders a scrollable list of tasks.
 *
 * Displays all tasks with status indicators, highlights the active task
 * being executed and the selected task for keyboard navigation.
 *
 * Features:
 * - Renders TaskItem components for each task
 * - Scrolling support for long task lists
 * - Highlights activeTaskId (task being executed)
 * - Highlights selectedIndex (keyboard navigation)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TaskItem } from './TaskItem';
import type { Task } from '../types';

interface TaskListPanelProps {
  /** Array of tasks to display */
  tasks: Task[];
  /** ID of the task currently being executed (or null) */
  activeTaskId: string | null;
  /** Index of the currently selected task for keyboard navigation */
  selectedIndex: number;
  /** Callback when a task is selected (reserved for future use) */
  onSelectTask?: (id: string) => void;
  /** Maximum height for the panel (for scrolling) */
  maxHeight?: number;
}

/**
 * TaskListPanel displays a scrollable list of tasks with status indicators.
 *
 * Shows all tasks in order with appropriate status symbols,
 * highlights the active task being executed and the selected task
 * for keyboard navigation.
 */
export function TaskListPanel({
  tasks,
  activeTaskId,
  selectedIndex,
  maxHeight,
}: TaskListPanelProps): React.ReactElement {
  // Handle empty task list
  if (tasks.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No tasks</Text>
      </Box>
    );
  }

  // Clamp selectedIndex to valid range
  const clampedSelectedIndex = Math.max(
    0,
    Math.min(selectedIndex, tasks.length - 1)
  );

  // Calculate visible window for scrolling if maxHeight is specified
  let visibleTasks = tasks;
  let startIndex = 0;

  if (maxHeight && maxHeight > 0 && tasks.length > maxHeight) {
    // Calculate scroll position to keep selected item visible
    // We want the selected item roughly in the middle of the visible area
    const halfWindow = Math.floor(maxHeight / 2);

    startIndex = Math.max(0, clampedSelectedIndex - halfWindow);

    // Ensure we don't scroll past the end
    if (startIndex + maxHeight > tasks.length) {
      startIndex = Math.max(0, tasks.length - maxHeight);
    }

    visibleTasks = tasks.slice(startIndex, startIndex + maxHeight);
  }

  return (
    <Box flexDirection="column">
      {/* Scroll indicator at top if needed */}
      {startIndex > 0 && (
        <Text dimColor>  ▲ ({startIndex} more above)</Text>
      )}

      {/* Task list */}
      {visibleTasks.map((task, index) => {
        const actualIndex = startIndex + index;
        const isActive = task.id === activeTaskId;
        const isSelected = actualIndex === clampedSelectedIndex;

        return (
          <TaskItem
            key={task.id}
            task={task}
            isActive={isActive}
            isSelected={isSelected}
          />
        );
      })}

      {/* Scroll indicator at bottom if needed */}
      {maxHeight &&
        maxHeight > 0 &&
        startIndex + maxHeight < tasks.length && (
          <Text dimColor>
            {'  '}▼ ({tasks.length - startIndex - maxHeight} more below)
          </Text>
        )}
    </Box>
  );
}
