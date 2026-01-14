#!/usr/bin/env npx tsx
/**
 * Standalone test script to verify ClaudeRunner works correctly.
 * Run with: npx tsx scripts/test-claude-runner.ts
 */

import { execa } from 'execa';

const SIMPLE_PROMPT = 'Say "Hello from Claude!" and nothing else.';

async function testDirectExeca() {
  console.log('=== Test 1: Direct execa call ===');
  console.log('Running: claude --print "<simple prompt>"');

  try {
    const result = await execa('claude', ['--print', SIMPLE_PROMPT], {
      reject: false,
      timeout: 30000,
    });

    console.log('Exit code:', result.exitCode);
    console.log('stdout length:', result.stdout?.length ?? 0);
    console.log('stderr length:', result.stderr?.length ?? 0);
    console.log('stdout:', result.stdout?.slice(0, 500) ?? '(empty)');
    if (result.stderr) {
      console.log('stderr:', result.stderr.slice(0, 500));
    }
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testExecaWithInput() {
  console.log('\n=== Test 2: execa with stdin input ===');
  console.log('Running: echo "<prompt>" | claude --print');

  try {
    const result = await execa('claude', ['--print'], {
      input: SIMPLE_PROMPT,
      reject: false,
      timeout: 30000,
    });

    console.log('Exit code:', result.exitCode);
    console.log('stdout length:', result.stdout?.length ?? 0);
    console.log('stderr length:', result.stderr?.length ?? 0);
    console.log('stdout:', result.stdout?.slice(0, 500) ?? '(empty)');
    if (result.stderr) {
      console.log('stderr:', result.stderr.slice(0, 500));
    }
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testExecaStreaming() {
  console.log('\n=== Test 3: execa with streaming (arg) ===');
  console.log('Running with stream handlers...');

  try {
    const proc = execa('claude', ['--print', SIMPLE_PROMPT], {
      reject: false,
      timeout: 30000,
    });

    console.log('PID:', proc.pid);

    if (proc.stdout) {
      proc.stdout.on('data', (chunk: Buffer) => {
        console.log('[stdout chunk]:', chunk.toString().slice(0, 200));
      });
    } else {
      console.log('No stdout stream!');
    }

    if (proc.stderr) {
      proc.stderr.on('data', (chunk: Buffer) => {
        console.log('[stderr chunk]:', chunk.toString().slice(0, 200));
      });
    } else {
      console.log('No stderr stream!');
    }

    const result = await proc;
    console.log('Final exit code:', result.exitCode);
    console.log('Final stdout length:', result.stdout?.length ?? 0);
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testExecaStreamingWithInput() {
  console.log('\n=== Test 3b: execa with streaming + stdin input ===');
  console.log('Running with stream handlers and stdin...');

  try {
    const proc = execa('claude', ['--print'], {
      input: SIMPLE_PROMPT,
      reject: false,
      timeout: 30000,
    });

    console.log('PID:', proc.pid);
    console.log('stdout exists:', !!proc.stdout);
    console.log('stderr exists:', !!proc.stderr);

    if (proc.stdout) {
      proc.stdout.on('data', (chunk: Buffer) => {
        console.log('[stdout chunk]:', chunk.toString().slice(0, 200));
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (chunk: Buffer) => {
        console.log('[stderr chunk]:', chunk.toString().slice(0, 200));
      });
    }

    const result = await proc;
    console.log('Final exit code:', result.exitCode);
    console.log('Final stdout:', result.stdout ?? '(empty)');
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testExecaWithPipe() {
  console.log('\n=== Test 3c: execa with explicit pipe stdio ===');

  try {
    const proc = execa('claude', ['--print'], {
      input: SIMPLE_PROMPT,
      reject: false,
      timeout: 30000,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    console.log('PID:', proc.pid);
    console.log('stdout exists:', !!proc.stdout);

    let output = '';
    if (proc.stdout) {
      for await (const chunk of proc.stdout) {
        const text = chunk.toString();
        console.log('[async stdout]:', text);
        output += text;
      }
    }

    const result = await proc;
    console.log('Final exit code:', result.exitCode);
    console.log('Collected output:', output);
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testClaudeHelp() {
  console.log('\n=== Test 4: claude --help (verify CLI works) ===');

  try {
    const result = await execa('claude', ['--help'], {
      reject: false,
      timeout: 10000,
    });

    console.log('Exit code:', result.exitCode);
    console.log('Help output (first 300 chars):', result.stdout?.slice(0, 300) ?? '(empty)');
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testWhichClaude() {
  console.log('\n=== Test 5: which claude ===');

  try {
    const result = await execa('which', ['claude'], {
      reject: false,
    });

    console.log('Claude path:', result.stdout?.trim() ?? '(not found)');
  } catch (error) {
    console.log('Error:', error);
  }
}

async function testClaudeRunnerClass() {
  console.log('\n=== Test 6: Using actual ClaudeRunner class ===');

  // Import the actual ClaudeRunner
  const { createClaudeRunner } = await import('../src/services/claudeRunner.js');

  const runner = createClaudeRunner();

  const outputs: string[] = [];

  runner.onOutput((text) => {
    console.log('[ClaudeRunner output]:', text.slice(0, 200));
    outputs.push(text);
  });

  runner.onExit((code) => {
    console.log('[ClaudeRunner exit]:', code);
    console.log('Total outputs collected:', outputs.length);
    console.log('All output:', outputs.join(''));
  });

  console.log('Spawning...');
  runner.spawn(SIMPLE_PROMPT, { cwd: process.cwd() });

  // Wait for process to complete
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('Test 6 complete');
}

async function main() {
  console.log('ClaudeRunner Verification Script');
  console.log('================================\n');

  await testWhichClaude();
  await testClaudeHelp();
  await testDirectExeca();
  await testExecaWithInput();
  await testExecaStreaming();
  await testExecaStreamingWithInput();
  await testExecaWithPipe();
  await testClaudeRunnerClass();

  console.log('\n================================');
  console.log('Verification complete.');
}

main().catch(console.error);
