/**
 * Task Types
 *
 * Types for tasks parsed from tasks.md files.
 */

/**
 * Status of a task in the workflow.
 */
export type TaskStatus = 'incomplete' | 'in_progress' | 'complete' | 'blocked';

/**
 * A task parsed from tasks.md.
 */
export interface Task {
  /** Task identifier (e.g., "1.1", "2.3") */
  id: string;
  /** Task title/name */
  title: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Detailed description of what the task involves */
  description?: string;
  /** Comma-separated list of files to modify */
  files?: string;
  /** Completion criteria ("Done when" clause) */
  criteria?: string;
  /** Comma-separated list of dependency task IDs (e.g., "1.1, 1.2") */
  dependencies?: string;
}
