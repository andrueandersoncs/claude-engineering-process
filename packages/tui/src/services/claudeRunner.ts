/**
 * ClaudeRunner Service
 *
 * Spawns and manages Claude CLI subprocesses following the "fresh context per task"
 * pattern from loop.sh (Ralph Wiggum insight). Each task gets a fresh Claude instance
 * to avoid context pollution and ensure consistent quality.
 *
 * This implementation uses direct `-p` flag to pass prompts to Claude CLI, replacing
 * the previous temp file + shell piping approach. This eliminates file I/O overhead
 * and potential race conditions.
 *
 * @see {@link https://github.com/anthropics/anthropic-sdk-typescript/issues/771|GitHub Issue #771}
 *      for the spawn fix that enables reliable JSONL streaming
 */

import { execa, type ExecaChildProcess, type ExecaReturnValue, type ExecaError } from 'execa';
import type { Readable } from 'stream';
import { JsonlStreamParser } from './jsonlParser';

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
  private jsonlParser: JsonlStreamParser = new JsonlStreamParser();

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
   * Uses direct `-p` flag to pass prompts to Claude CLI, following the proven
   * pattern from loop.sh.
   *
   * **Critical environment configuration:**
   * - `ANTHROPIC_API_KEY: ''` - Empty string prevents Claude CLI from hanging during
   *   subprocess spawn. This is required for reliable stdio communication.
   * - `FORCE_COLOR: '1'` - Preserves colored output in the stream
   *
   * **stdio configuration:**
   * - stdin: 'inherit' - Allows interactive prompts if needed (though not typical)
   * - stdout: 'pipe' - Captures JSONL stream for parsing
   * - stderr: 'pipe' - Captures error messages
   *
   * @param prompt - The prompt to send to Claude
   * @param options - Optional spawn options (cwd, env)
   *
   * @see {@link https://github.com/anthropics/anthropic-sdk-typescript/issues/771|GitHub Issue #771}
   */
  spawn(prompt: string, options: SpawnOptions = {}): void {
    // Kill any existing process first
    if (this.process) {
      this.kill();
    }

    // Reset JSONL parser for fresh state
    this.jsonlParser = new JsonlStreamParser();

    // Merge environment with required configuration for reliable spawn.
    // ANTHROPIC_API_KEY: '' prevents hang during subprocess spawn (see method docs).
    // FORCE_COLOR: '1' preserves colored output in the stream.
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ANTHROPIC_API_KEY: '',
      FORCE_COLOR: '1',
      ...options.env,
    };

    try {
      // Use direct execa spawn with -p flag (proven pattern from loop.sh)
      // --output-format stream-json enables real-time JSONL streaming
      // --verbose is required when combining -p with --output-format stream-json
      // --permission-mode bypassPermissions prevents hang from permission prompts
      this.process = execa(this.claudeBin, [
        '-p', prompt,
        '--output-format', 'stream-json',
        '--verbose',
        '--permission-mode', 'bypassPermissions',
      ], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env,
        cwd: options.cwd,
        // Don't throw on non-zero exit (we handle it in onExit)
        reject: false,
      });

      // Check if process started successfully
      if (!this.process.pid) {
        this.notifyOutput('[Error] Process failed to start - no PID assigned\n');
        this.notifyExit(1);
        return;
      }

      this.notifyOutput(`[Debug] Process started with PID: ${this.process.pid}\n`);

      // Set up stdout streaming with JSONL parsing
      if (this.process.stdout) {
        this.setupJsonlStreamHandler(this.process.stdout);
      }

      // Set up stderr streaming (raw text for error messages)
      if (this.process.stderr) {
        this.setupRawStreamHandler(this.process.stderr);
      }

      // Handle process exit
      this.process
        .then((result: ExecaReturnValue) => {
          const exitCode = result.exitCode ?? 1;
          this.notifyExit(exitCode);
          this.process = null;
        })
        .catch((error: ExecaError) => {
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
      this.notifyOutput(`[Error] Failed to spawn process: ${error instanceof Error ? error.message : String(error)}\n`);
      this.notifyExit(1);
    }
  }

  /**
   * Sets up a stream handler that parses JSONL and extracts displayable content.
   * Used for stdout which contains Claude's streaming JSONL output.
   *
   * The stream contains newline-delimited JSON events from Claude API:
   * - `content_block_delta` with `text_delta` - Streaming text chunks
   * - `content_block_start` with `tool_use` - Tool invocation events
   * - `result` - Final completion event
   *
   * The JsonlStreamParser handles partial lines across chunks and extracts
   * only displayable content, filtering out metadata events.
   *
   * @see JsonlStreamParser for parsing implementation details
   */
  private setupJsonlStreamHandler(stream: Readable): void {
    stream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const messages = this.jsonlParser.parse(text);

      for (const msg of messages) {
        switch (msg.type) {
          case 'text':
            this.notifyOutput(msg.content);
            break;
          case 'tool_use':
            this.notifyOutput(`\n[Tool: ${msg.toolName}]\n`);
            break;
          case 'result':
            // Final result handled by exit callback
            break;
        }
      }
    });

    stream.on('end', () => {
      // Flush any remaining buffered content
      const remaining = this.jsonlParser.flush();
      for (const msg of remaining) {
        if (msg.type === 'text') {
          this.notifyOutput(msg.content);
        }
      }
    });
  }

  /**
   * Sets up a raw stream handler that passes text directly to callbacks.
   * Used for stderr which contains error messages (not JSONL).
   */
  private setupRawStreamHandler(stream: Readable): void {
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
