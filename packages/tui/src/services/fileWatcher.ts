/**
 * FileWatcher Service
 *
 * Watches story directory files for changes using chokidar. Provides callbacks
 * for workflow-state.json and tasks.md changes with debouncing to prevent
 * duplicate events.
 */

import * as chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { join } from 'path';

/**
 * Callback type for file change events.
 */
export type FileChangeCallback = () => void;

/**
 * Interface for the FileWatcher service.
 */
export interface FileWatcher {
  /** Start watching a story directory */
  watch(storyDir: string): void;
  /** Stop watching and clean up */
  stop(): void;
  /** Register a callback for workflow-state.json changes */
  onWorkflowChange(callback: FileChangeCallback): void;
  /** Register a callback for tasks.md changes */
  onTasksChange(callback: FileChangeCallback): void;
  /** Remove a workflow change callback */
  offWorkflowChange(callback: FileChangeCallback): void;
  /** Remove a tasks change callback */
  offTasksChange(callback: FileChangeCallback): void;
  /** Remove all callbacks */
  removeAllListeners(): void;
  /** Check if currently watching */
  isWatching(): boolean;
  /** Get the currently watched directory */
  getWatchedDir(): string | null;
}

/**
 * Default debounce delay in milliseconds.
 * Prevents duplicate events from rapid file changes.
 */
const DEFAULT_DEBOUNCE_MS = 100;

/**
 * Implementation of the FileWatcher service.
 *
 * Uses chokidar to watch for file changes with debouncing to prevent
 * duplicate callbacks from rapid saves or editor events.
 */
export class FileWatcherImpl implements FileWatcher {
  private watcher: FSWatcher | null = null;
  private workflowCallbacks: Set<FileChangeCallback> = new Set();
  private tasksCallbacks: Set<FileChangeCallback> = new Set();
  private watchedDir: string | null = null;
  private debounceMs: number;

  // Debounce timers for each file type
  private workflowDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private tasksDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates a new FileWatcher instance.
   *
   * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
   */
  constructor(debounceMs: number = DEFAULT_DEBOUNCE_MS) {
    this.debounceMs = debounceMs;
  }

  /**
   * Starts watching a story directory for changes.
   *
   * Watches workflow-state.json and tasks.md files specifically.
   * If already watching, stops the previous watcher first.
   *
   * @param storyDir - Path to the story directory to watch
   */
  watch(storyDir: string): void {
    // Stop any existing watcher first
    if (this.watcher) {
      this.stop();
    }

    this.watchedDir = storyDir;

    // Define the files to watch
    const workflowStatePath = join(storyDir, 'workflow-state.json');
    const tasksPath = join(storyDir, 'tasks.md');

    // Create watcher with chokidar
    this.watcher = chokidar.watch([workflowStatePath, tasksPath], {
      // Use polling for better cross-platform compatibility
      usePolling: false,
      // Ignore initial add events
      ignoreInitial: true,
      // Wait for write to finish
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10,
      },
    });

    // Handle change events
    this.watcher.on('change', (path: string) => {
      this.handleFileChange(path);
    });

    // Also handle add events (file created)
    this.watcher.on('add', (path: string) => {
      this.handleFileChange(path);
    });

    // Handle errors gracefully
    this.watcher.on('error', (error: Error) => {
      // Log error but don't crash - file watching is non-critical
      console.error('FileWatcher error:', error.message);
    });
  }

  /**
   * Handles a file change event, dispatching to the appropriate callbacks.
   */
  private handleFileChange(path: string): void {
    const filename = path.split('/').pop() || path.split('\\').pop();

    if (filename === 'workflow-state.json') {
      this.debouncedNotify('workflow');
    } else if (filename === 'tasks.md') {
      this.debouncedNotify('tasks');
    }
  }

  /**
   * Notifies callbacks with debouncing to prevent duplicate events.
   */
  private debouncedNotify(type: 'workflow' | 'tasks'): void {
    if (type === 'workflow') {
      // Clear existing timer
      if (this.workflowDebounceTimer) {
        clearTimeout(this.workflowDebounceTimer);
      }
      // Set new timer
      this.workflowDebounceTimer = setTimeout(() => {
        this.workflowDebounceTimer = null;
        this.notifyWorkflowChange();
      }, this.debounceMs);
    } else {
      // Clear existing timer
      if (this.tasksDebounceTimer) {
        clearTimeout(this.tasksDebounceTimer);
      }
      // Set new timer
      this.tasksDebounceTimer = setTimeout(() => {
        this.tasksDebounceTimer = null;
        this.notifyTasksChange();
      }, this.debounceMs);
    }
  }

  /**
   * Notifies all workflow change callbacks.
   */
  private notifyWorkflowChange(): void {
    for (const callback of this.workflowCallbacks) {
      try {
        callback();
      } catch {
        // Ignore callback errors to prevent one bad callback from breaking others
      }
    }
  }

  /**
   * Notifies all tasks change callbacks.
   */
  private notifyTasksChange(): void {
    for (const callback of this.tasksCallbacks) {
      try {
        callback();
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Stops watching and cleans up resources.
   */
  stop(): void {
    // Clear any pending debounce timers
    if (this.workflowDebounceTimer) {
      clearTimeout(this.workflowDebounceTimer);
      this.workflowDebounceTimer = null;
    }
    if (this.tasksDebounceTimer) {
      clearTimeout(this.tasksDebounceTimer);
      this.tasksDebounceTimer = null;
    }

    // Close the watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.watchedDir = null;
  }

  /**
   * Registers a callback for workflow-state.json changes.
   *
   * @param callback - Function to call when workflow-state.json changes
   */
  onWorkflowChange(callback: FileChangeCallback): void {
    this.workflowCallbacks.add(callback);
  }

  /**
   * Registers a callback for tasks.md changes.
   *
   * @param callback - Function to call when tasks.md changes
   */
  onTasksChange(callback: FileChangeCallback): void {
    this.tasksCallbacks.add(callback);
  }

  /**
   * Removes a workflow change callback.
   *
   * @param callback - The callback to remove
   */
  offWorkflowChange(callback: FileChangeCallback): void {
    this.workflowCallbacks.delete(callback);
  }

  /**
   * Removes a tasks change callback.
   *
   * @param callback - The callback to remove
   */
  offTasksChange(callback: FileChangeCallback): void {
    this.tasksCallbacks.delete(callback);
  }

  /**
   * Removes all registered callbacks.
   */
  removeAllListeners(): void {
    this.workflowCallbacks.clear();
    this.tasksCallbacks.clear();
  }

  /**
   * Returns whether the watcher is currently active.
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }

  /**
   * Returns the currently watched directory, or null if not watching.
   */
  getWatchedDir(): string | null {
    return this.watchedDir;
  }
}

/**
 * Creates a new FileWatcher instance.
 *
 * @param debounceMs - Optional debounce delay in milliseconds
 * @returns A new FileWatcher instance
 */
export function createFileWatcher(debounceMs?: number): FileWatcher {
  return new FileWatcherImpl(debounceMs);
}
