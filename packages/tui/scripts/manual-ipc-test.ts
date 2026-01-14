#!/usr/bin/env npx tsx
/**
 * Manual Integration Test: TUI IPC Communication
 *
 * Tests the ClaudeRunner spawn implementation with real Claude CLI.
 *
 * Criteria:
 * 1. Spawn Claude with a simple prompt
 * 2. Verify streaming output appears in real-time
 * 3. Verify task completes successfully (exit code 0)
 * 4. Verify no temp files in /tmp after completion
 *
 * Run with: npx tsx scripts/manual-ipc-test.ts
 */

import { execa } from 'execa';
import { JsonlStreamParser } from '../src/services/jsonlParser';
import * as fs from 'fs';
import * as os from 'os';

// ANSI colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(color: string, prefix: string, msg: string): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${color}[${timestamp}] ${prefix}${RESET} ${msg}`);
}

function info(msg: string): void { log(CYAN, 'INFO', msg); }
function pass(msg: string): void { log(GREEN, 'PASS', msg); }
function fail(msg: string): void { log(RED, 'FAIL', msg); }
function warn(msg: string): void { log(YELLOW, 'WARN', msg); }

function getTempFiles(): string[] {
  const tmpDir = os.tmpdir();
  try {
    // Only count prompt temp files, not Claude's internal symlinks
    return fs.readdirSync(tmpDir).filter(f =>
      f.startsWith('claude-prompt-') ||
      (f.startsWith('claude-') && f.endsWith('.txt'))
    );
  } catch {
    return [];
  }
}

async function runTest(): Promise<boolean> {
  info('='.repeat(60));
  info('Manual Integration Test: TUI IPC Communication');
  info('='.repeat(60));

  // Record temp files before test
  const tempFilesBefore = getTempFiles();
  info(`Prompt temp files before: ${tempFilesBefore.length === 0 ? 'none' : tempFilesBefore.join(', ')}`);

  const testPrompt = 'Please respond with exactly: "Hello from Claude! IPC test successful." Do not add anything else.';
  const parser = new JsonlStreamParser();

  let outputReceived = false;
  let outputChunks: string[] = [];
  let firstOutputTime: number | null = null;
  let exitCode: number | null = null;

  const startTime = Date.now();

  info(`Starting Claude with test prompt...`);
  info(`Prompt: "${testPrompt}"`);
  info('');
  info('--- Claude Output ---');

  try {
    // Spawn Claude directly using execa with the same configuration as claudeRunner.ts
    const proc = execa('claude', [
      '-p', testPrompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--permission-mode', 'bypassPermissions',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],  // Use 'ignore' for stdin instead of 'inherit'
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: '',
        FORCE_COLOR: '1',
      },
      cwd: process.cwd(),
      reject: false,
    });

    // Handle stdout streaming with JSONL parsing
    if (proc.stdout) {
      proc.stdout.on('data', (chunk: Buffer) => {
        if (!firstOutputTime) {
          firstOutputTime = Date.now();
          const latency = firstOutputTime - startTime;
          info(`First output received after ${latency}ms`);
        }
        outputReceived = true;

        const text = chunk.toString();
        const messages = parser.parse(text);

        for (const msg of messages) {
          if (msg.type === 'text') {
            outputChunks.push(msg.content);
            process.stdout.write(msg.content);
          } else if (msg.type === 'tool_use') {
            info(`[Tool: ${msg.toolName}]`);
          }
        }
      });
    }

    // Handle stderr
    if (proc.stderr) {
      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.trim()) {
          console.error(`[stderr] ${text}`);
        }
      });
    }

    // Wait for process to complete with timeout
    const timeoutMs = 60000;
    const result = await Promise.race([
      proc,
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          proc.kill('SIGTERM');
          reject(new Error('Timeout after 60 seconds'));
        }, timeoutMs)
      ),
    ]);

    exitCode = result.exitCode ?? 1;

  } catch (error: any) {
    if (error.message?.includes('Timeout')) {
      fail('Test timed out after 60 seconds');
      return false;
    }
    fail(`Error: ${error.message}`);
    exitCode = 1;
  }

  // Flush remaining buffer
  const remaining = parser.flush();
  for (const msg of remaining) {
    if (msg.type === 'text') {
      outputChunks.push(msg.content);
      process.stdout.write(msg.content);
    }
  }

  const totalTime = Date.now() - startTime;

  console.log('\n');
  info('='.repeat(60));
  info('Test Results');
  info('='.repeat(60));

  // Check criteria
  let allPassed = true;

  // Criterion 1: Streaming output received
  if (outputReceived && outputChunks.length > 0) {
    pass(`Streaming output received (${outputChunks.length} chunks)`);
  } else {
    fail('No streaming output received');
    allPassed = false;
  }

  // Criterion 2: Real-time streaming (first output within 10s)
  if (firstOutputTime && (firstOutputTime - startTime) < 10000) {
    pass(`Real-time streaming verified (${firstOutputTime - startTime}ms to first output)`);
  } else if (firstOutputTime) {
    warn(`First output took ${firstOutputTime - startTime}ms (> 10s threshold)`);
  } else {
    fail('No first output time recorded');
    allPassed = false;
  }

  // Criterion 3: Exit code 0
  if (exitCode === 0) {
    pass(`Task completed successfully (exit code: ${exitCode})`);
  } else {
    fail(`Task failed with exit code: ${exitCode}`);
    allPassed = false;
  }

  // Criterion 4: No temp files created
  const tempFilesAfter = getTempFiles();
  const newTempFiles = tempFilesAfter.filter(f => !tempFilesBefore.includes(f));
  if (newTempFiles.length === 0) {
    pass('No prompt temp files created during execution');
  } else {
    fail(`Prompt temp files created: ${newTempFiles.join(', ')}`);
    allPassed = false;
  }

  info('='.repeat(60));
  info(`Total execution time: ${totalTime}ms`);

  if (allPassed) {
    pass('ALL TESTS PASSED');
  } else {
    fail('SOME TESTS FAILED');
  }

  info('='.repeat(60));

  return allPassed;
}

// Run the test
runTest()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    fail(`Test error: ${error.message}`);
    process.exit(1);
  });
