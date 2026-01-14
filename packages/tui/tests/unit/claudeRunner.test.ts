/**
 * Unit tests for the ClaudeRunner service spawn implementation.
 *
 * These tests verify the new spawn implementation that uses the `-p` flag
 * and proper environment configuration, following the proven loop.sh pattern.
 *
 * Following TDD principles, these tests are written BEFORE the implementation
 * is refactored, so they will FAIL initially.
 *
 * Test criteria from Task 1.2:
 * - Test execa called with `-p` flag
 * - Test `--output-format stream-json` flag present
 * - Test `ANTHROPIC_API_KEY: ''` in env
 * - Test stdio configured as `['inherit', 'pipe', 'pipe']`
 * - Test no temp files created (mock fs, verify no writeFileSync calls)
 * - Test large prompt (50KB) handling
 * - Test special characters in prompt
 *
 * Reference: GitHub Issue #771 documents the spawn configuration fix.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { EventEmitter } from 'events';

// Mock execa before importing ClaudeRunner
vi.mock('execa', () => ({
  execa: vi.fn(),
  execaCommand: vi.fn(),
}));

// Mock fs to verify no temp files are created
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Import after mocks are set up
import { execa, execaCommand } from 'execa';
import { writeFileSync } from 'fs';
import { ClaudeRunnerImpl, createClaudeRunner } from '../../src/services/claudeRunner';

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
 * Creates a mock subprocess with stdout/stderr streams.
 */
function createMockProcess() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  const mockProcess = {
    pid: 12345,
    stdout,
    stderr,
    kill: vi.fn(),
    then: vi.fn().mockImplementation((resolve) => {
      // Simulate async completion
      setTimeout(() => resolve({ exitCode: 0 }), 10);
      return mockProcess;
    }),
    catch: vi.fn().mockReturnThis(),
  };

  return mockProcess;
}

describe('ClaudeRunner', () => {
  let mockProcess: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = createMockProcess();
    (execa as Mock).mockReturnValue(mockProcess);
    (execaCommand as Mock).mockReturnValue(mockProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('spawn() - execa configuration', () => {
    it('uses execa() with -p flag to pass prompt', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Hello, Claude!';

      runner.spawn(prompt);

      // Verify execa is called (not execaCommand)
      expect(execa).toHaveBeenCalled();

      // Get the call arguments
      const [binary, args] = (execa as Mock).mock.calls[0];

      // Verify -p flag with prompt value
      expect(binary).toBe('claude');
      expect(args).toContain('-p');
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('includes --output-format stream-json flag', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, args] = (execa as Mock).mock.calls[0];

      expect(args).toContain('--output-format');
      const formatIndex = args.indexOf('--output-format');
      expect(args[formatIndex + 1]).toBe('stream-json');
    });

    it('includes --verbose flag (required with -p and --output-format stream-json)', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, args] = (execa as Mock).mock.calls[0];

      // --verbose is required when combining -p with --output-format stream-json
      expect(args).toContain('--verbose');
    });

    it('includes --permission-mode bypassPermissions flag to prevent hang', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, args] = (execa as Mock).mock.calls[0];

      // --permission-mode bypassPermissions prevents hang from permission prompts
      expect(args).toContain('--permission-mode');
      const modeIndex = args.indexOf('--permission-mode');
      expect(args[modeIndex + 1]).toBe('bypassPermissions');
    });

    it('sets ANTHROPIC_API_KEY to empty string in env', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.env).toBeDefined();
      expect(options.env.ANTHROPIC_API_KEY).toBe('');
    });

    it('configures stdio as [inherit, pipe, pipe]', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.stdio).toEqual(['inherit', 'pipe', 'pipe']);
    });

    it('preserves FORCE_COLOR in environment', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.env.FORCE_COLOR).toBe('1');
    });

    it('passes cwd option to execa', () => {
      const runner = new ClaudeRunnerImpl();
      const cwd = '/path/to/project';

      runner.spawn('Test prompt', { cwd });

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.cwd).toBe(cwd);
    });

    it('merges custom env vars while preserving required ones', () => {
      const runner = new ClaudeRunnerImpl();
      const customEnv = { MY_VAR: 'custom_value' };

      runner.spawn('Test prompt', { env: customEnv });

      const [, , options] = (execa as Mock).mock.calls[0];

      // Custom var should be present
      expect(options.env.MY_VAR).toBe('custom_value');
      // Required vars should still be set
      expect(options.env.ANTHROPIC_API_KEY).toBe('');
      expect(options.env.FORCE_COLOR).toBe('1');
    });

    it('uses custom claude binary path when provided', () => {
      const customBin = '/usr/local/bin/claude-custom';
      const runner = new ClaudeRunnerImpl(customBin);

      runner.spawn('Test prompt');

      const [binary] = (execa as Mock).mock.calls[0];
      expect(binary).toBe(customBin);
    });

    it('sets reject: false to handle errors manually', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.reject).toBe(false);
    });
  });

  describe('spawn() - no temp files', () => {
    it('does not call writeFileSync (no temp file creation)', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('does not use execaCommand with shell mode', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      // execaCommand is the shell-mode function, should not be called
      expect(execaCommand).not.toHaveBeenCalled();
    });

    it('does not include shell: true in options', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      expect(options.shell).toBeUndefined();
    });

    it('does not include buffer: true (enables streaming)', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      const [, , options] = (execa as Mock).mock.calls[0];

      // buffer: true would contradict streaming, should not be set
      expect(options.buffer).toBeUndefined();
    });
  });

  describe('spawn() - large prompt handling', () => {
    it('handles 50KB prompt without error', () => {
      const runner = new ClaudeRunnerImpl();
      // Generate a 50KB prompt
      const largePrompt = 'x'.repeat(50 * 1024);

      expect(() => {
        runner.spawn(largePrompt);
      }).not.toThrow();

      // Verify the full prompt is passed
      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(largePrompt);
      expect(args[pIndex + 1].length).toBe(50 * 1024);
    });

    it('handles 100KB prompt (near design limit)', () => {
      const runner = new ClaudeRunnerImpl();
      // Generate a 100KB prompt
      const largePrompt = 'y'.repeat(100 * 1024);

      expect(() => {
        runner.spawn(largePrompt);
      }).not.toThrow();

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1].length).toBe(100 * 1024);
    });

    it('passes prompt with embedded context (realistic size)', () => {
      const runner = new ClaudeRunnerImpl();

      // Simulate realistic prompt with embedded files
      const taskContext = 'Task: Implement feature X\n'.repeat(100); // ~2.6KB
      const designDoc = '# Design\n'.repeat(500) + 'Details...\n'.repeat(1000); // ~15KB
      const researchNotes = '## Research\n'.repeat(300) + 'Notes...\n'.repeat(500); // ~10KB
      const tasksContent = '- [ ] Task\n'.repeat(200); // ~2.4KB

      const realisticPrompt = `
${taskContext}

## Context Files

### design.md
${designDoc}

### research-notes.md
${researchNotes}

### tasks.md
${tasksContent}
      `.trim();

      expect(() => {
        runner.spawn(realisticPrompt);
      }).not.toThrow();

      // Verify full prompt passed
      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(realisticPrompt);
    });
  });

  describe('spawn() - special characters in prompt', () => {
    it('handles prompt with shell metacharacters', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'echo $HOME && rm -rf / | grep "test"';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      // Prompt should be passed verbatim, no shell escaping needed
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with backticks', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Run `npm install` then `npm test`';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with quotes (single and double)', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = `He said "Hello" and she said 'World'`;

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with newlines', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Line 1\nLine 2\nLine 3';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with unicode and emoji', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Hello 👋 世界 日本語 émojis 🎉';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with escape sequences', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Tab:\tNewline:\nCarriage return:\r';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles prompt with null bytes (edge case)', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = 'Before\0After';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });

    it('handles empty prompt', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = '';

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe('');
    });

    it('handles prompt with code snippets', () => {
      const runner = new ClaudeRunnerImpl();
      const prompt = `
Implement this function:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

Make sure to handle edge cases.
      `.trim();

      runner.spawn(prompt);

      const [, args] = (execa as Mock).mock.calls[0];
      const pIndex = args.indexOf('-p');
      expect(args[pIndex + 1]).toBe(prompt);
    });
  });

  describe('spawn() - callback behavior', () => {
    it('notifies output callbacks when stdout receives data', async () => {
      const runner = new ClaudeRunnerImpl();
      const outputCallback = vi.fn();
      runner.onOutput(outputCallback);

      runner.spawn('Test prompt');

      // Simulate stdout data (JSONL format as Claude CLI uses with --output-format stream-json)
      mockProcess.stdout.emit('data', Buffer.from(createJsonlTextEvent('Hello from Claude')));

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(outputCallback).toHaveBeenCalledWith(expect.stringContaining('Hello from Claude'));
    });

    it('notifies exit callbacks when process exits', async () => {
      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      // Make mockProcess.then resolve immediately
      mockProcess.then = vi.fn().mockImplementation((resolve) => {
        resolve({ exitCode: 0 });
        return mockProcess;
      });

      runner.spawn('Test prompt');

      // Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(exitCallback).toHaveBeenCalledWith(0);
    });
  });

  describe('createClaudeRunner factory', () => {
    it('creates a ClaudeRunner instance', () => {
      const runner = createClaudeRunner();
      expect(runner).toBeDefined();
      expect(typeof runner.spawn).toBe('function');
      expect(typeof runner.kill).toBe('function');
      expect(typeof runner.isRunning).toBe('function');
    });

    it('accepts custom claude binary path', () => {
      const customBin = '/custom/path/to/claude';
      const runner = createClaudeRunner(customBin);

      runner.spawn('Test');

      const [binary] = (execa as Mock).mock.calls[0];
      expect(binary).toBe(customBin);
    });
  });

  describe('kill() behavior', () => {
    it('kills running process', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      runner.kill();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('reports not running after kill', () => {
      const runner = new ClaudeRunnerImpl();
      runner.spawn('Test prompt');

      expect(runner.isRunning()).toBe(true);

      runner.kill();

      expect(runner.isRunning()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles spawn error gracefully', () => {
      // Make execa throw
      (execa as Mock).mockImplementation(() => {
        throw new Error('spawn ENOENT');
      });

      const runner = new ClaudeRunnerImpl();
      const outputCallback = vi.fn();
      const exitCallback = vi.fn();
      runner.onOutput(outputCallback);
      runner.onExit(exitCallback);

      // Should not throw
      expect(() => {
        runner.spawn('Test prompt');
      }).not.toThrow();

      // Should notify of error
      expect(outputCallback).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
      expect(exitCallback).toHaveBeenCalledWith(1);
    });

    it('handles non-zero exit code', async () => {
      mockProcess.then = vi.fn().mockImplementation((resolve) => {
        resolve({ exitCode: 1 });
        return mockProcess;
      });

      const runner = new ClaudeRunnerImpl();
      const exitCallback = vi.fn();
      runner.onExit(exitCallback);

      runner.spawn('Test prompt');

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(exitCallback).toHaveBeenCalledWith(1);
    });
  });
});
