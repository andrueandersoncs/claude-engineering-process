/**
 * TaskParser Service
 *
 * Parses tasks.md files into structured Task objects.
 */

import type { Task, TaskStatus } from '../types';

// Re-export types for backward compatibility with existing tests
export type { Task, TaskStatus } from '../types';

/**
 * Regex pattern to match task header lines.
 * Matches: - [ ] **Task X.Y**: Title
 * Groups: [1] status marker (space, x, X, or ~), [2] task ID, [3] title
 */
const TASK_HEADER_PATTERN = /^-\s*\[([xX\s~])\]\s*\*\*Task\s+(\d+\.\d+)\*\*:\s*(.+)$/;

/**
 * Regex pattern to match field lines.
 * Matches: - **FieldName**: Value
 * Groups: [1] field name, [2] field value
 */
const FIELD_PATTERN = /^\s*-\s*\*\*([^*]+)\*\*:\s*(.+)$/;

/**
 * Maps status marker characters to TaskStatus values.
 */
function parseStatusMarker(marker: string): TaskStatus {
  const normalized = marker.toLowerCase().trim();
  switch (normalized) {
    case 'x':
      return 'complete';
    case '~':
      return 'in_progress';
    case '':
    case ' ':
    default:
      return 'incomplete';
  }
}

/**
 * Parses the content of a tasks.md file into an array of Task objects.
 *
 * @param content - The raw content of a tasks.md file
 * @returns Array of parsed Task objects
 */
export function parseTasksFile(content: string): Task[] {
  if (!content || !content.trim()) {
    return [];
  }

  const lines = content.split('\n');
  const tasks: Task[] = [];
  let currentTask: Task | null = null;

  for (const line of lines) {
    // Try to match a task header line
    const headerMatch = line.match(TASK_HEADER_PATTERN);

    if (headerMatch) {
      // If we have a current task, push it before starting a new one
      if (currentTask) {
        tasks.push(currentTask);
      }

      const statusMarker = headerMatch[1] ?? ' ';
      const taskId = headerMatch[2] ?? '';
      const title = headerMatch[3] ?? '';

      currentTask = {
        id: taskId,
        title: title.trim(),
        status: parseStatusMarker(statusMarker),
      };
      continue;
    }

    // If we have a current task, try to match field lines
    if (currentTask) {
      const fieldMatch = line.match(FIELD_PATTERN);

      if (fieldMatch) {
        const fieldName = fieldMatch[1] ?? '';
        const fieldValue = fieldMatch[2] ?? '';
        const normalizedFieldName = fieldName.toLowerCase().trim();
        const trimmedValue = fieldValue.trim();

        switch (normalizedFieldName) {
          case 'description':
            currentTask.description = trimmedValue;
            break;
          case 'files':
            currentTask.files = trimmedValue;
            break;
          case 'done when':
            currentTask.criteria = trimmedValue;
            break;
          case 'dependencies':
            currentTask.dependencies = trimmedValue;
            break;
          // Ignore other fields like "Status" (status comes from the marker)
        }
      }
    }
  }

  // Don't forget to push the last task
  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}
