/**
 * ClaudeRunner Service
 *
 * Spawns and manages Claude CLI subprocesses following the "fresh context per task"
 * pattern from loop.sh (Ralph Wiggum insight). Each task gets a fresh Claude instance
 * to avoid context pollution and ensure consistent quality.
 */

import { execa, execaCommand, type ExecaChildProcess, type ExecaReturnValue, type ExecaError } from 'execa';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Readable } from 'stream';

/**
 * Callback for receiving output from the subprocess.
 */
export type OutputCallback = (data: string) => void;

/**
 * Callback for subprocess exit events.
 */
export type ExitCallback = (code: number) => void;

/**
 * Options for spawning Claude.
 */
export interface SpawnOptions {
  /** Working directory for the subprocess */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
}

/**
 * Interface for the ClaudeRunner service.
 */
export interface ClaudeRunner {
  /** Spawn a new Claude process with the given prompt */
  spawn(prompt: string, options?: SpawnOptions): void;
  /** Kill the running process */
  kill(): void;
  /** Check if a process is currently running */
  isRunning(): boolean;
  /** Register a callback for stdout/stderr output */
  onOutput(callback: OutputCallback): void;
  /** Register a callback for process exit */
  onExit(callback: ExitCallback): void;
  /** Remove an output callback */
  offOutput(callback: OutputCallback): void;
  /** Remove an exit callback */
  offExit(callback: ExitCallback): void;
  /** Remove all callbacks */
  removeAllListeners(): void;
}

/**
 * Implementation of the ClaudeRunner service.
 *
 * Manages a single Claude CLI subprocess, streaming output to registered callbacks
 * and notifying on exit.
 */
export class ClaudeRunnerImpl implements ClaudeRunner {
  private process: ExecaChildProcess | null = null;
  private outputCallbacks: Set<OutputCallback> = new Set();
  private exitCallbacks: Set<ExitCallback> = new Set();
  private claudeBin: string;
  private tempFile: string | null = null;

  /**
   * Creates a new ClaudeRunner instance.
   *
   * @param claudeBin - Path to the Claude CLI binary (default: 'claude')
   */
  constructor(claudeBin: string = 'claude') {
    this.claudeBin = claudeBin;
  }

  /**
   * Spawns a new Claude CLI process with the given prompt.
   *
   * If a process is already running, it will be killed first.
   *
   * Uses a temp file approach for stdin because execa's direct stdin input
   * doesn't work reliably with Claude CLI for long prompts.
   *
   * @param prompt - The prompt to send to Claude
   * @param options - Optional spawn options (cwd, env)
   */
  spawn(prompt: string, options: SpawnOptions = {}): void {
    // Kill any existing process first
    if (this.process) {
      this.kill();
    }

    // Merge environment with FORCE_COLOR preserved for colored output
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      FORCE_COLOR: '1',
      ...options.env,
    };

    try {
      // Write prompt to a temp file to avoid stdin issues with execa
      // The temp file approach is more reliable than shell piping for long prompts
      this.tempFile = join(tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
      writeFileSync(this.tempFile, prompt);

      // Use shell mode to pipe the temp file to Claude
      const command = `cat "${this.tempFile}" | ${this.claudeBin} --print`;

      this.process = execaCommand(command, {
        shell: true,
        env,
        cwd: options.cwd,
        // Don't throw on non-zero exit (we handle it in onExit)
        reject: false,
        // Buffer output for final capture, but also stream it
        buffer: true,
      });

      // Check if process started successfully
      if (!this.process.pid) {
        this.notifyOutput('[Error] Process failed to start - no PID assigned\n');
        this.cleanupTempFile();
        this.notifyExit(1);
        return;
      }

      this.notifyOutput(`[Debug] Process started with PID: ${this.process.pid}\n`);

      // Set up stdout streaming
      if (this.process.stdout) {
        this.setupStreamHandler(this.process.stdout);
      }

      // Set up stderr streaming (also captured for error messages)
      if (this.process.stderr) {
        this.setupStreamHandler(this.process.stderr);
      }

      // Handle process exit
      this.process
        .then((result: ExecaReturnValue) => {
          this.cleanupTempFile();
          const exitCode = result.exitCode ?? 1;
          this.notifyExit(exitCode);
          this.process = null;
        })
        .catch((error: ExecaError) => {
          this.cleanupTempFile();
          // Process was killed or errored
          this.notifyOutput(`[Error] Process error: ${error.message}\n`);
          if (error.stderr) {
            this.notifyOutput(`[Error] stderr: ${error.stderr}\n`);
          }
          const exitCode = error.exitCode ?? 1;
          this.notifyExit(exitCode);
          this.process = null;
        });
    } catch (error) {
      this.cleanupTempFile();
      this.notifyOutput(`[Error] Failed to spawn process: ${error instanceof Error ? error.message : String(error)}\n`);
      this.notifyExit(1);
    }
  }

  /**
   * Cleans up the temp file used for stdin input.
   */
  private cleanupTempFile(): void {
    if (this.tempFile) {
      try {
        unlinkSync(this.tempFile);
      } catch {
        // Ignore cleanup errors
      }
      this.tempFile = null;
    }
  }

  /**
   * Sets up a stream handler that converts chunks to strings and notifies callbacks.
   */
  private setupStreamHandler(stream: Readable): void {
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      this.notifyOutput(text);
    });
  }

  /**
   * Notifies all registered output callbacks.
   */
  private notifyOutput(data: string): void {
    for (const callback of this.outputCallbacks) {
      try {
        callback(data);
      } catch {
        // Ignore callback errors to prevent one bad callback from breaking others
      }
    }
  }

  /**
   * Notifies all registered exit callbacks.
   */
  private notifyExit(code: number): void {
    for (const callback of this.exitCallbacks) {
      try {
        callback(code);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Kills the running process if one exists.
   *
   * Sends SIGTERM for graceful shutdown.
   */
  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.cleanupTempFile();
  }

  /**
   * Returns whether a Claude process is currently running.
   */
  isRunning(): boolean {
    return this.process !== null;
  }

  /**
   * Registers a callback to receive stdout/stderr output.
   *
   * @param callback - Function to call with output data
   */
  onOutput(callback: OutputCallback): void {
    this.outputCallbacks.add(callback);
  }

  /**
   * Registers a callback for process exit.
   *
   * @param callback - Function to call with exit code
   */
  onExit(callback: ExitCallback): void {
    this.exitCallbacks.add(callback);
  }

  /**
   * Removes an output callback.
   *
   * @param callback - The callback to remove
   */
  offOutput(callback: OutputCallback): void {
    this.outputCallbacks.delete(callback);
  }

  /**
   * Removes an exit callback.
   *
   * @param callback - The callback to remove
   */
  offExit(callback: ExitCallback): void {
    this.exitCallbacks.delete(callback);
  }

  /**
   * Removes all registered callbacks.
   */
  removeAllListeners(): void {
    this.outputCallbacks.clear();
    this.exitCallbacks.clear();
  }
}

/**
 * Global registry of active ClaudeRunner instances.
 * Used for cleanup on application exit.
 */
const activeRunners: Set<ClaudeRunner> = new Set();

/**
 * Creates a new ClaudeRunner instance and registers it for cleanup.
 *
 * @param claudeBin - Optional path to Claude CLI binary
 * @returns A new ClaudeRunner instance
 */
export function createClaudeRunner(claudeBin?: string): ClaudeRunner {
  const runner = new ClaudeRunnerImpl(claudeBin);
  activeRunners.add(runner);
  return runner;
}

/**
 * Unregisters a ClaudeRunner from the global registry.
 * Call this when disposing of a runner to prevent memory leaks.
 *
 * @param runner - The runner to unregister
 */
export function unregisterRunner(runner: ClaudeRunner): void {
  activeRunners.delete(runner);
}

/**
 * Kills all running Claude processes.
 * Should be called on application exit to ensure clean shutdown.
 */
export function killAllRunners(): void {
  for (const runner of activeRunners) {
    if (runner.isRunning()) {
      runner.kill();
    }
  }
}

/**
 * Gets the count of active runners (for testing/debugging).
 */
export function getActiveRunnerCount(): number {
  return activeRunners.size;
}
