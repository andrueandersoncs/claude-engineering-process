/**
 * TaskItem component - renders an individual task with status indicator.
 *
 * Displays task ID and title with visual status indicators:
 * - [ ] incomplete - dimmed
 * - [x] complete - green
 * - [~] in_progress - yellow
 * - [!] blocked - red
 *
 * Supports highlighting for:
 * - Active task (being executed) - shown with indicator
 * - Selected task (keyboard navigation) - shown with background/inverse
 *
 * Long titles are truncated with ellipsis.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Task, TaskStatus } from '../types';

interface TaskItemProps {
  task: Task;
  /** Whether this task is currently being executed */
  isActive: boolean;
  /** Whether this task is selected via keyboard navigation */
  isSelected: boolean;
  /** Maximum width for title before truncation (optional) */
  maxTitleWidth?: number;
}

/**
 * Returns the status symbol and color for a given task status.
 */
function getStatusDisplay(status: TaskStatus): { symbol: string; color: string } {
  switch (status) {
    case 'complete':
      return { symbol: '[x]', color: 'green' };
    case 'in_progress':
      return { symbol: '[~]', color: 'yellow' };
    case 'blocked':
      return { symbol: '[!]', color: 'red' };
    case 'incomplete':
    default:
      return { symbol: '[ ]', color: 'gray' };
  }
}

/**
 * Truncates a string with ellipsis if it exceeds maxLength.
 */
function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * TaskItem displays an individual task with status indicator.
 *
 * Shows status symbol, task ID, and title. Highlights active and selected states.
 */
export function TaskItem({
  task,
  isActive,
  isSelected,
  maxTitleWidth = 50,
}: TaskItemProps): React.ReactElement {
  const { symbol, color } = getStatusDisplay(task.status);
  const displayTitle = truncateWithEllipsis(task.title, maxTitleWidth);

  // Determine text styling based on state
  const textColor = isActive ? 'cyan' : isSelected ? 'white' : undefined;
  const isBold = isActive || isSelected;
  const isDimmed = !isActive && !isSelected && task.status === 'incomplete';

  return (
    <Box>
      {/* Selected indicator */}
      <Text color={isSelected ? 'cyan' : undefined}>
        {isSelected ? '> ' : '  '}
      </Text>

      {/* Status symbol */}
      <Text color={color}>
        {symbol}
      </Text>

      {/* Task ID */}
      <Text color={textColor} bold={isBold} dimColor={isDimmed}>
        {' '}{task.id}
      </Text>

      {/* Task title */}
      <Text color={textColor} bold={isBold} dimColor={isDimmed}>
        {' '}{displayTitle}
      </Text>

      {/* Active indicator */}
      {isActive && (
        <Text color="cyan" bold>
          {' <'}
        </Text>
      )}
    </Box>
  );
}
