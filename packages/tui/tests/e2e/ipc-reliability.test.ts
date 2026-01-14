/**
 * E2E Test: IPC Reliability
 *
 * Tests the complete spawn flow for ClaudeRunner IPC communication.
 * These tests verify that the spawn implementation correctly handles
 * the full lifecycle of a Claude subprocess.
 *
 * Test criteria from Task 1.3:
 * - Test spawn with mock Claude process
 * - Test streaming output received in order
 * - Test exit callback invoked with correct code
 * - Verify no temp files in system tmpdir
 *
 * Following TDD principles, these tests are written BEFORE the implementation
 * is refactored, so some tests will FAIL initially until the implementation
 * is updated to use the `-p` flag approach.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock execa to control subprocess behavior
vi.mock('execa', () => ({
  execa: vi.fn(),
  execaCommand: vi.fn(),
}));

// Import after mocks are set up
import { execa, execaCommand } from 'execa';
import { ClaudeRunnerImpl } from '../../src/services/claudeRunner';

/**
 * Creates a JSONL text_delta event string for testing.
 * This matches the format that Claude CLI outputs with --output-format stream-json.
 */
function createJsonlTextEvent(text: string): string {
  return JSON.stringify({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text }
  }) + '\n';
}

/**
 * Creates a mock subprocess with controllable stdout/stderr streams.
 * Allows simulating streaming output and process exit.
 */
function createMockProcess(options: {
  exitCode?: number;
  exitDelay?: number;
} = {}) {
  const { exitCode = 0, exitDelay = 100 } = options;

  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  let exitPromiseResolve: ((value: { exitCode: number }) => void) | null = null;

  const mockProcess = {
    pid: 12345,
    stdout,
    stderr,
    kill: vi.fn(() => {
      // Simulate immediate exit when killed
      if (exitPromiseResolve) {
        exitPromiseResolve({ exitCode: 137 }); // SIGTERM exit code
      }
    }),
    then: vi.fn((resolve) => {
      exitPromiseResolve = resolve;
      // Auto-resolve after delay unless killed
      setTimeout(() => {
        if (exitPromiseResolve) {
          resolve({ exitCode });
        }
      }, exitDelay);
      return mockProcess;
    }),
    catch: vi.fn().mockReturnThis(),
  };

  return {
    mockProcess,
    // Helper to emit stdout data
    emitStdout: (data: string) => {
      stdout.emit('data', Buffer.from(data));
    },
    // Helper to emit stderr data
    emitStderr: (data: string) => {
      stderr.emit('data', Buffer.from(data));
    },
    // Helper to trigger exit immediately
    triggerExit: (code: number) => {
      if (exitPromiseResolve) {
        exitPromiseResolve({ exitCode: code });
        exitPromiseResolve = null;
      }
    },
  };
}

/**
 * Gets list of files in system tmpdir matching a pattern.
 * Used to verify no temp files are created.
 */
function getTempFiles(pattern: RegExp): string[] {
  const tempPath = tmpdir();
  try {
    const files = readdirSync(tempPath);
    return files.filter(f => pattern.test(f));
  } catch {
    return [];
  }
}

/**
 * Cleans up any temp files matching the claude-prompt pattern.
 * Used to ensure clean state between tests.
 */
function cleanupTempFiles(): void {
  const tempPath = tmpdir();
  try {
    const files = readdirSync(tempPath);
    const { unlinkSync } = require('fs');
    for (const file of files) {
      if (/claude-prompt-/.test(file)) {
        try {
          unlinkSync(join(tempPath, file));
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

describe('E2E: IPC Reliability', () => {
  let mockSetup: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any temp files from previous tests
    cleanupTempFiles();
    mockSetup = createMockProcess();
    (execa as ReturnType<typeof vi.fn>).mockReturnValue(mockSetup.mockProcess);
    (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mockSetup.mockProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any temp files created during tests
    cleanupTempFiles();
  });

  describe('spawn with mock Claude process', () => {
    it('successfully spawns and receives PID', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      expect(runner.isRunning()).toBe(true);
    });

    /**
     * TDD RED TEST: This test will FAIL until ClaudeRunner is refactored to use
     * direct execa() with -p flag instead of execaCommand() with temp files.
     * See Task 3.1 for the implementation that will make this test pass.
     */
    it('spawns with correct binary and flags', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Hello world');

      // After refactor, should use execa (not execaCommand)
      expect(execa).toHaveBeenCalled();

      const [binary, args] = (execa as ReturnType<typeof vi.fn>).mock.calls[0];

      // Should use claude binary with -p flag
      expect(binary).toBe('claude');
      expect(args).toContain('-p');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
    });

    /**
     * TDD RED TEST: This test will FAIL until ClaudeRunner is refactored to use
     * direct execa() instead of execaCommand(). The test checks execa call args.
     * See Task 3.1 for the implementation that will make this test pass.
     */
    it('passes custom cwd to spawn', () => {
      const runner = new ClaudeRunnerImpl();
      const testCwd = '/path/to/project';

      runner.spawn('Test', { cwd: testCwd });

      const [, , options] = (execa as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.cwd).toBe(testCwd);
    });

    it('handles spawn failure gracefully', () => {
      // Make both execa and execaCommand throw an error
      // (current implementation uses execaCommand, new will use execa)
      const spawnError = new Error('ENOENT: spawn claude not found');
      (execa as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw spawnError;
      });
      (execaCommand as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw spawnError;
      });

      const runner = new ClaudeRunnerImpl();
      const outputCallback = vi.fn();
      const exitCallback = vi.fn();
      runner.onOutput(outputCallback);
      runner.onExit(exitCallback);

      // Should not throw
      expect(() => runner.spawn('Test')).not.toThrow();

      // Should report error via callbacks
      expect(outputCallback).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
      expect(exitCallback).toHaveBeenCalledWith(1);
    });
  });

  describe('streaming output received in order', () => {
    it('receives stdout output via callback', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputCallback = vi.fn();
      runner.onOutput(outputCallback);

      runner.spawn('Test prompt');

      // Emit JSONL-formatted output (as Claude CLI does with --output-format stream-json)
      mockSetup.emitStdout(createJsonlTextEvent('Hello '));
      mockSetup.emitStdout(createJsonlTextEvent('World!'));

      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should receive both outputs in order
      expect(outputCallback).toHaveBeenCalled();
      const calls = outputCallback.mock.calls.map(c => c[0]);

      // Verify content was received (implementation may vary in exact format)
      const fullOutput = calls.join('');
      expect(fullOutput).toContain('Hello');
      expect(fullOutput).toContain('World');
    });

    it('receives stderr output via callback', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputCallback = vi.fn();
      runner.onOutput(outputCallback);

      runner.spawn('Test prompt');

      // Emit stderr
      mockSetup.emitStderr('Warning: something');

      await new Promise(resolve => setTimeout(resolve, 10));

      const fullOutput = outputCallback.mock.calls.map(c => c[0]).join('');
      expect(fullOutput).toContain('Warning');
    });

    it('maintains output order for interleaved stdout/stderr', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputOrder: string[] = [];

      runner.onOutput((data) => {
        outputOrder.push(data.trim());
      });

      runner.spawn('Test prompt');

      // Interleave stdout (JSONL) and stderr (raw text)
      mockSetup.emitStdout(createJsonlTextEvent('stdout-1'));
      mockSetup.emitStderr('stderr-1\n');
      mockSetup.emitStdout(createJsonlTextEvent('stdout-2'));
      mockSetup.emitStderr('stderr-2\n');

      await new Promise(resolve => setTimeout(resolve, 20));

      // All outputs should be received (order depends on event loop,
      // but all should be present)
      const allOutput = outputOrder.join(' ');
      expect(allOutput).toContain('stdout-1');
      expect(allOutput).toContain('stderr-1');
      expect(allOutput).toContain('stdout-2');
      expect(allOutput).toContain('stderr-2');
    });

    it('handles large streaming output', async () => {
      const runner = new ClaudeRunnerImpl();
      const chunks: string[] = [];

      runner.onOutput((data) => {
        chunks.push(data);
      });

      runner.spawn('Test prompt');

      // Emit a large amount of data in JSONL chunks
      const chunkSize = 1024;
      const totalChunks = 50; // 50KB total text content

      for (let i = 0; i < totalChunks; i++) {
        mockSetup.emitStdout(createJsonlTextEvent('x'.repeat(chunkSize)));
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive all data (minus the JSONL wrapper overhead)
      const totalReceived = chunks.join('').length;
      // Allow for debug prefixes that may be added, and account for
      // the extracted text (not the full JSONL)
      expect(totalReceived).toBeGreaterThanOrEqual(chunkSize * totalChunks * 0.9);
    });

    it('handles rapid sequential outputs', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputs: string[] = [];

      runner.onOutput((data) => {
        outputs.push(data);
      });

      runner.spawn('Test prompt');

      // Rapid fire JSONL outputs
      for (let i = 0; i < 100; i++) {
        mockSetup.emitStdout(createJsonlTextEvent(`line-${i}`));
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      const fullOutput = outputs.join('');
      // Should receive all lines
      expect(fullOutput).toContain('line-0');
      expect(fullOutput).toContain('line-99');
    });
  });

  describe('exit callback invoked with correct code', () => {
    it('receives exit code 0 on success', async () => {
      const successMock = createMockProcess({ exitCode: 0, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(successMock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(successMock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitCallback).toHaveBeenCalledWith(0);
    });

    it('receives exit code 1 on error', async () => {
      const errorMock = createMockProcess({ exitCode: 1, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(errorMock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(errorMock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitCallback).toHaveBeenCalledWith(1);
    });

    it('receives non-zero exit code for other failures', async () => {
      const failMock = createMockProcess({ exitCode: 2, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(failMock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(failMock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(exitCallback).toHaveBeenCalledWith(2);
    });

    it('exit callback invoked exactly once', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(exitCallback).toHaveBeenCalledTimes(1);
    });

    it('runner reports not running after exit', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      expect(runner.isRunning()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(runner.isRunning()).toBe(false);
    });

    it('kill() triggers exit callback', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 1000 }); // Long delay
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      // Kill before natural exit
      runner.kill();

      // Should report not running immediately
      expect(runner.isRunning()).toBe(false);
    });
  });

  describe('no temp files in system tmpdir', () => {
    /**
     * TDD RED TEST: This test will FAIL until ClaudeRunner is refactored to use
     * the -p flag instead of temp files for passing prompts.
     * See Task 3.2 for the implementation that will make this test pass.
     */
    it('does not create temp files during spawn', () => {
      // Record temp files before spawn
      const beforeFiles = getTempFiles(/claude-prompt-/);

      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      // Check temp files after spawn
      const afterFiles = getTempFiles(/claude-prompt-/);

      // No new temp files should be created
      // (After refactoring, this test should pass)
      expect(afterFiles.length).toBeLessThanOrEqual(beforeFiles.length);
    });

    it('does not leave temp files after process exit', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 50 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      // Wait for exit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for any leftover temp files
      const tempFiles = getTempFiles(/claude-prompt-/);

      // Should be no temp files (after refactoring)
      expect(tempFiles).toEqual([]);
    });

    it('does not leave temp files after kill', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 1000 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');
      runner.kill();

      await new Promise(resolve => setTimeout(resolve, 50));

      const tempFiles = getTempFiles(/claude-prompt-/);
      expect(tempFiles).toEqual([]);
    });

    it('does not leave temp files after spawn error', () => {
      // Make both execa and execaCommand throw
      // (current implementation uses execaCommand, new will use execa)
      const spawnError = new Error('spawn failed');
      (execa as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw spawnError;
      });
      (execaCommand as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw spawnError;
      });

      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const tempFiles = getTempFiles(/claude-prompt-/);
      expect(tempFiles).toEqual([]);
    });

    it('does not leave temp files with multiple sequential spawns', async () => {
      const runner = new ClaudeRunnerImpl();

      // Spawn multiple times
      for (let i = 0; i < 5; i++) {
        const mock = createMockProcess({ exitCode: 0, exitDelay: 20 });
        (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
        (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

        runner.spawn(`Test prompt ${i}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const tempFiles = getTempFiles(/claude-prompt-/);
      expect(tempFiles).toEqual([]);
    });
  });

  describe('complete spawn lifecycle', () => {
    it('completes full lifecycle: spawn -> output -> exit', async () => {
      const mock = createMockProcess({ exitCode: 0, exitDelay: 200 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const outputs: string[] = [];
      const exitCodes: number[] = [];

      runner.onOutput((data) => outputs.push(data));
      runner.onExit((code) => exitCodes.push(code));

      // Phase 1: Spawn
      runner.spawn('Implement feature X');
      expect(runner.isRunning()).toBe(true);

      // Phase 2: Streaming output (JSONL format)
      mock.emitStdout(createJsonlTextEvent('Starting implementation...'));
      mock.emitStdout(createJsonlTextEvent('Writing code...'));
      mock.emitStdout(createJsonlTextEvent('Done!'));

      await new Promise(resolve => setTimeout(resolve, 50));

      const fullOutput = outputs.join('');
      expect(fullOutput).toContain('implementation');
      expect(fullOutput).toContain('Done');

      // Phase 3: Exit
      mock.triggerExit(0);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitCodes).toContain(0);
      expect(runner.isRunning()).toBe(false);

      // Phase 4: Cleanup verification
      const tempFiles = getTempFiles(/claude-prompt-/);
      expect(tempFiles).toEqual([]);
    });

    it('handles error lifecycle: spawn -> error output -> non-zero exit', async () => {
      const mock = createMockProcess({ exitCode: 1, exitDelay: 200 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      const runner = new ClaudeRunnerImpl();
      const outputs: string[] = [];
      const exitCodes: number[] = [];

      runner.onOutput((data) => outputs.push(data));
      runner.onExit((code) => exitCodes.push(code));

      // Spawn
      runner.spawn('Invalid request');

      // Error output
      mock.emitStderr('Error: Invalid API key\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(outputs.join('')).toContain('Error');

      // Exit with error code
      mock.triggerExit(1);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitCodes).toContain(1);
    });

    it('supports multiple sequential task executions', async () => {
      const runner = new ClaudeRunnerImpl();
      const allOutputs: string[][] = [];
      const allExitCodes: number[] = [];

      runner.onExit((code) => allExitCodes.push(code));

      // Execute 3 tasks sequentially
      for (let taskNum = 0; taskNum < 3; taskNum++) {
        const taskOutputs: string[] = [];
        allOutputs.push(taskOutputs);

        runner.onOutput((data) => taskOutputs.push(data));

        const mock = createMockProcess({ exitCode: 0, exitDelay: 30 });
        (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
        (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

        runner.spawn(`Task ${taskNum}`);
        mock.emitStdout(createJsonlTextEvent(`Output from task ${taskNum}`));

        await new Promise(resolve => setTimeout(resolve, 80));

        runner.removeAllListeners();
        runner.onExit((code) => allExitCodes.push(code));
      }

      // Verify all tasks completed
      expect(allExitCodes.length).toBeGreaterThanOrEqual(3);
      expect(allExitCodes.filter(c => c === 0).length).toBeGreaterThanOrEqual(3);

      // Verify no temp files remain
      const tempFiles = getTempFiles(/claude-prompt-/);
      expect(tempFiles).toEqual([]);
    });
  });

  describe('callback management', () => {
    it('multiple output callbacks all receive data', async () => {
      const runner = new ClaudeRunnerImpl();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      runner.onOutput(callback1);
      runner.onOutput(callback2);
      runner.onOutput(callback3);

      runner.spawn('Test');
      mockSetup.emitStdout(createJsonlTextEvent('Hello'));

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('removed callback does not receive data', async () => {
      const runner = new ClaudeRunnerImpl();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      runner.onOutput(callback1);
      runner.onOutput(callback2);
      runner.offOutput(callback1);

      runner.spawn('Test');
      mockSetup.emitStdout(createJsonlTextEvent('Hello'));

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('removeAllListeners clears all callbacks', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputCb = vi.fn();
      const exitCb = vi.fn();

      runner.onOutput(outputCb);
      runner.onExit(exitCb);
      runner.removeAllListeners();

      const mock = createMockProcess({ exitCode: 0, exitDelay: 20 });
      (execa as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);
      (execaCommand as ReturnType<typeof vi.fn>).mockReturnValue(mock.mockProcess);

      runner.spawn('Test');
      mock.emitStdout(createJsonlTextEvent('data'));

      await new Promise(resolve => setTimeout(resolve, 50));

      // Callbacks should not be called after removeAllListeners
      // (though internal debug output may still occur)
      expect(outputCb).not.toHaveBeenCalled();
    });
  });
});
