/**
 * WorkflowOrchestrator Service
 *
 * Coordinates task execution, validation, and phase advancement.
 * Follows the "fresh context per task" pattern from loop.sh, spawning
 * a new Claude process for each task to avoid context pollution.
 */

import { join } from 'path';
import { writeFileSync, existsSync } from 'fs';
import { execa, type ExecaError } from 'execa';
import type { ClaudeRunner, OutputCallback, ExitCallback } from './claudeRunner';
import { buildPrompt, type PromptContext } from './promptBuilder';
import { parseTasksFile } from './taskParser';
import type { Task, TaskStatus } from '../types';
import { readFileSafe } from '../utils/files';

/**
 * Callback type for orchestrator state changes.
 */
export type StateChangeCallback = () => void;

/**
 * Options for creating a WorkflowOrchestrator.
 */
export interface OrchestratorOptions {
  /** Path to the story directory */
  storyDir: string;
  /** Path to the project directory (for running validation) */
  projectDir: string;
  /** ClaudeRunner instance for spawning Claude */
  runner: ClaudeRunner;
  /** Path to the validation script (optional, defaults to scripts/run-validation.sh) */
  validationScript?: string;
}

/**
 * Interface for the WorkflowOrchestrator service.
 */
export interface WorkflowOrchestrator {
  /** Execute the next incomplete task */
  executeNextTask(): Promise<void>;
  /** Pause the workflow (current task completes, no auto-advance) */
  pause(): void;
  /** Resume the workflow from paused state */
  resume(): Promise<void>;
  /** Run the validation script */
  runValidation(): Promise<boolean>;
  /** Mark a task's status in tasks.md */
  markTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  /** Get the currently active task ID */
  getActiveTaskId(): string | null;
  /** Check if workflow is paused */
  isPaused(): boolean;
  /** Check if a task is currently running */
  isRunning(): boolean;
  /** Get all tasks parsed from tasks.md */
  getTasks(): Task[];
  /** Get the next incomplete task */
  getNextTask(): Task | null;
  /** Register callback for output data */
  onOutput(callback: OutputCallback): void;
  /** Remove output callback */
  offOutput(callback: OutputCallback): void;
  /** Register callback for task completion */
  onTaskComplete(callback: (taskId: string, success: boolean) => void): void;
  /** Remove task completion callback */
  offTaskComplete(callback: (taskId: string, success: boolean) => void): void;
  /** Register callback for state changes */
  onStateChange(callback: StateChangeCallback): void;
  /** Remove state change callback */
  offStateChange(callback: StateChangeCallback): void;
  /** Reload tasks from tasks.md */
  reloadTasks(): void;
  /** Clean up resources */
  destroy(): void;
}

/**
 * Implementation of the WorkflowOrchestrator service.
 */
export class WorkflowOrchestratorImpl implements WorkflowOrchestrator {
  private storyDir: string;
  private projectDir: string;
  private runner: ClaudeRunner;
  private validationScript: string;

  private _isPaused: boolean = false;
  private _isRunning: boolean = false;
  private activeTaskId: string | null = null;
  private tasks: Task[] = [];

  private outputCallbacks: Set<OutputCallback> = new Set();
  private taskCompleteCallbacks: Set<(taskId: string, success: boolean) => void> = new Set();
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();

  // Bound callbacks for runner events
  private boundOutputHandler: OutputCallback;
  private boundExitHandler: ExitCallback;

  /**
   * Creates a new WorkflowOrchestrator instance.
   */
  constructor(options: OrchestratorOptions) {
    this.storyDir = options.storyDir;
    this.projectDir = options.projectDir;
    this.runner = options.runner;
    this.validationScript = options.validationScript ?? join(this.projectDir, '.claude', 'hooks', 'run-validation.sh');

    // Bind handlers to preserve 'this' context
    this.boundOutputHandler = this.handleOutput.bind(this);
    this.boundExitHandler = this.handleExit.bind(this);

    // Load initial tasks
    this.reloadTasks();

    // Set up runner callbacks
    this.runner.onOutput(this.boundOutputHandler);
    this.runner.onExit(this.boundExitHandler);
  }

  /**
   * Reloads tasks from tasks.md file.
   */
  reloadTasks(): void {
    const tasksPath = join(this.storyDir, 'tasks.md');
    const content = readFileSafe(tasksPath);
    if (content !== null) {
      this.tasks = parseTasksFile(content);
    } else {
      this.tasks = [];
    }
  }

  /**
   * Gets all tasks.
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Gets the next incomplete task that is ready to execute.
   * A task is ready if all its dependencies are complete.
   */
  getNextTask(): Task | null {
    // Find the first incomplete task
    for (const task of this.tasks) {
      if (task.status === 'incomplete' || task.status === 'in_progress') {
        // Check if dependencies are satisfied
        if (this.areDependenciesSatisfied(task)) {
          return task;
        }
      }
    }
    return null;
  }

  /**
   * Checks if all dependencies for a task are complete.
   */
  private areDependenciesSatisfied(task: Task): boolean {
    if (!task.dependencies || task.dependencies.toLowerCase() === 'none') {
      return true;
    }

    const depIds = task.dependencies.split(',').map(id => id.trim());
    for (const depId of depIds) {
      const depTask = this.tasks.find(t => t.id === depId);
      if (!depTask || depTask.status !== 'complete') {
        return false;
      }
    }
    return true;
  }

  /**
   * Executes the next incomplete task.
   */
  async executeNextTask(): Promise<void> {
    // Reload tasks to get latest state
    this.reloadTasks();

    const task = this.getNextTask();
    if (!task) {
      this._isRunning = false;
      this.activeTaskId = null;
      this.notifyStateChange();
      return;
    }

    this._isRunning = true;
    this.activeTaskId = task.id;

    // Mark task as in_progress
    await this.markTaskStatus(task.id, 'in_progress');
    this.notifyStateChange();

    // Notify output callbacks of task start
    this.notifyOutput(`\n> Starting Task ${task.id}: ${task.title}\n\n`);

    // Build prompt with context
    const promptContext: PromptContext = {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description ?? '',
      taskFiles: task.files ?? '',
      taskCriteria: task.criteria ?? '',
      storyDir: this.storyDir,
    };

    try {
      const prompt = await buildPrompt(promptContext);

      // Spawn Claude with the prompt
      this.runner.spawn(prompt, { cwd: this.projectDir });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notifyOutput(`\n> Error building prompt: ${message}\n`);
      this._isRunning = false;
      this.activeTaskId = null;
      this.notifyStateChange();
    }
  }

  /**
   * Handles output from the Claude runner.
   */
  private handleOutput(data: string): void {
    this.notifyOutput(data);
  }

  /**
   * Handles exit from the Claude runner.
   */
  private async handleExit(code: number): Promise<void> {
    const taskId = this.activeTaskId;
    if (!taskId) {
      return;
    }

    if (code === 0) {
      // Run validation
      this.notifyOutput('\n> Running validation...\n');
      const validationPassed = await this.runValidation();

      if (validationPassed) {
        await this.markTaskStatus(taskId, 'complete');
        this.notifyOutput('\n> Task completed successfully ✓\n');
        this.notifyTaskComplete(taskId, true);

        // Execute next task if not paused
        if (!this._isPaused) {
          // Small delay before starting next task
          setTimeout(() => {
            this.executeNextTask();
          }, 100);
        } else {
          this._isRunning = false;
          this.activeTaskId = null;
          this.notifyStateChange();
        }
      } else {
        this.notifyOutput('\n> Validation failed ✗\n');
        this.notifyTaskComplete(taskId, false);
        // Keep task as in_progress so it can be retried
        this._isRunning = false;
        this.activeTaskId = null;
        this.notifyStateChange();
      }
    } else {
      this.notifyOutput(`\n> Task failed with exit code ${code} ✗\n`);
      this.notifyTaskComplete(taskId, false);
      // Keep task as in_progress so it can be retried
      this._isRunning = false;
      this.activeTaskId = null;
      this.notifyStateChange();
    }
  }

  /**
   * Pauses the workflow.
   * The current task will complete, but no new tasks will be started.
   */
  pause(): void {
    this._isPaused = true;
    this.notifyOutput('\n> Workflow paused. Current task will complete.\n');
    this.notifyStateChange();
  }

  /**
   * Resumes the workflow from paused state.
   */
  async resume(): Promise<void> {
    this._isPaused = false;
    this.notifyStateChange();

    // If no task is running, start the next one
    if (!this.runner.isRunning()) {
      await this.executeNextTask();
    }
  }

  /**
   * Runs the validation script.
   * @returns true if validation passed, false otherwise
   */
  async runValidation(): Promise<boolean> {
    // Check if validation script exists
    if (!existsSync(this.validationScript)) {
      // Try alternative location in plugin directory
      const altScript = join(process.cwd(), 'scripts', 'run-validation.sh');
      if (existsSync(altScript)) {
        this.validationScript = altScript;
      } else {
        // No validation script found, consider validation passed
        this.notifyOutput('> No validation script found, skipping validation\n');
        return true;
      }
    }

    try {
      const result = await execa('bash', [this.validationScript], {
        cwd: this.projectDir,
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
        reject: false,
      });

      // Stream validation output
      if (result.stdout) {
        this.notifyOutput(result.stdout + '\n');
      }
      if (result.stderr) {
        this.notifyOutput(result.stderr + '\n');
      }

      return result.exitCode === 0;
    } catch (error) {
      const execaError = error as ExecaError;
      this.notifyOutput(`> Validation error: ${execaError.message}\n`);
      return false;
    }
  }

  /**
   * Marks a task's status in tasks.md.
   */
  async markTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const tasksPath = join(this.storyDir, 'tasks.md');
    const content = readFileSafe(tasksPath);
    if (content === null) {
      return;
    }

    // Map status to marker character
    const markerMap: Record<TaskStatus, string> = {
      incomplete: ' ',
      in_progress: '~',
      complete: 'x',
      blocked: '!',
    };
    const marker = markerMap[status];

    // Regex to find the task header and replace the status marker
    // Matches: - [ ] **Task X.Y**: or - [x] **Task X.Y**: etc.
    const taskPattern = new RegExp(
      `^(\\s*-\\s*\\[)[xX\\s~!](\\]\\s*\\*\\*Task\\s+${this.escapeRegex(taskId)}\\*\\*:)`,
      'gm'
    );

    const updatedContent = content.replace(taskPattern, `$1${marker}$2`);

    // Write back to file
    try {
      writeFileSync(tasksPath, updatedContent, 'utf-8');
      // Reload tasks after update
      this.reloadTasks();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notifyOutput(`> Error updating task status: ${message}\n`);
    }
  }

  /**
   * Escapes special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Gets the currently active task ID.
   */
  getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  /**
   * Checks if the workflow is paused.
   */
  isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Checks if a task is currently running.
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Notifies output callbacks.
   */
  private notifyOutput(data: string): void {
    for (const callback of this.outputCallbacks) {
      try {
        callback(data);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Notifies task completion callbacks.
   */
  private notifyTaskComplete(taskId: string, success: boolean): void {
    for (const callback of this.taskCompleteCallbacks) {
      try {
        callback(taskId, success);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Notifies state change callbacks.
   */
  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback();
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Registers a callback for output data.
   */
  onOutput(callback: OutputCallback): void {
    this.outputCallbacks.add(callback);
  }

  /**
   * Removes an output callback.
   */
  offOutput(callback: OutputCallback): void {
    this.outputCallbacks.delete(callback);
  }

  /**
   * Registers a callback for task completion.
   */
  onTaskComplete(callback: (taskId: string, success: boolean) => void): void {
    this.taskCompleteCallbacks.add(callback);
  }

  /**
   * Removes a task completion callback.
   */
  offTaskComplete(callback: (taskId: string, success: boolean) => void): void {
    this.taskCompleteCallbacks.delete(callback);
  }

  /**
   * Registers a callback for state changes.
   */
  onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.add(callback);
  }

  /**
   * Removes a state change callback.
   */
  offStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Cleans up resources.
   */
  destroy(): void {
    // Remove runner callbacks
    this.runner.offOutput(this.boundOutputHandler);
    this.runner.offExit(this.boundExitHandler);

    // Clear all callbacks
    this.outputCallbacks.clear();
    this.taskCompleteCallbacks.clear();
    this.stateChangeCallbacks.clear();
  }
}

/**
 * Creates a new WorkflowOrchestrator instance.
 */
export function createWorkflowOrchestrator(options: OrchestratorOptions): WorkflowOrchestrator {
  return new WorkflowOrchestratorImpl(options);
}
