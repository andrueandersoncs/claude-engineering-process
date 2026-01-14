/**
 * Services Barrel Export
 *
 * Re-exports all services from a single entry point.
 */

export { parseTasksFile } from './taskParser';
export type { Task, TaskStatus } from './taskParser';

export { buildPrompt } from './promptBuilder';
export type { PromptContext } from './promptBuilder';

export {
  ClaudeRunnerImpl,
  createClaudeRunner,
  unregisterRunner,
  killAllRunners,
  getActiveRunnerCount,
} from './claudeRunner';
export type {
  ClaudeRunner,
  OutputCallback,
  ExitCallback,
  SpawnOptions,
} from './claudeRunner';

export { FileWatcherImpl, createFileWatcher } from './fileWatcher';
export type { FileWatcher, FileChangeCallback } from './fileWatcher';

export { WorkflowOrchestratorImpl, createWorkflowOrchestrator } from './workflowOrchestrator';
export type {
  WorkflowOrchestrator,
  OrchestratorOptions,
  StateChangeCallback,
} from './workflowOrchestrator';

export { JsonlStreamParser } from './jsonlParser';
export type { JsonlMessage } from './jsonlParser';
