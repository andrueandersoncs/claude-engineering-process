#!/usr/bin/env npx tsx
/**
 * Integration test that simulates exactly what the TUI does
 * when the user presses Enter on the SetupView.
 *
 * This uses the REAL ClaudeRunner (no mocking) to identify
 * where the actual integration fails.
 */

import { createClaudeRunner, unregisterRunner, type ClaudeRunner } from '../src/services/claudeRunner';
import { buildWorkflowStartPrompt } from '../src/services/promptBuilder';
import type { WorkflowState } from '../src/types';

// Simulate the exact flow from App.tsx
async function testTUIIntegration() {
  console.log('=== TUI Integration Test ===\n');

  // 1. Create a mock story (like what would be in the store)
  const mockStory: WorkflowState = {
    story: 'Test Story',
    slug: 'test-story',
    source: 'direct',
    currentPhase: 'understand',
    completedPhases: [],
    startedAt: new Date().toISOString(),
  };

  const projectDir = process.cwd();
  console.log('Project dir:', projectDir);

  // 2. Create the ClaudeRunner (like useEffect does)
  console.log('\n--- Creating ClaudeRunner ---');
  const claudeRunnerRef: { current: ClaudeRunner | null } = { current: null };
  claudeRunnerRef.current = createClaudeRunner();
  console.log('ClaudeRunner created');

  // 3. Set up callbacks (like useEffect does)
  const outputs: string[] = [];
  let exitCode: number | null = null;

  const appendOutputRef = {
    current: (text: string) => {
      console.log('[appendOutput]:', text.slice(0, 100).replace(/\n/g, '\\n'));
      outputs.push(text);
    },
  };

  const stopWorkflowRef = {
    current: () => {
      console.log('[stopWorkflow] called');
    },
  };

  const handleOutput = (text: string): void => {
    appendOutputRef.current(text);
  };

  const handleExit = (code: number): void => {
    console.log('[handleExit] code:', code);
    exitCode = code;
    stopWorkflowRef.current();
  };

  claudeRunnerRef.current.onOutput(handleOutput);
  claudeRunnerRef.current.onExit(handleExit);
  console.log('Callbacks registered');

  // 4. Simulate handleStartEngineeringWorkflow
  console.log('\n--- Starting Engineering Workflow ---');

  // Test with SIMPLE prompt first to verify basic functionality
  const simplePrompt = 'Say "Hello from TUI integration test!" and nothing else.';

  // Build the REAL prompt (like handleStartEngineeringWorkflow does)
  const realPrompt = buildWorkflowStartPrompt({
    story: mockStory,
    projectDir,
  });

  // TOGGLE: Use simple or real prompt
  const USE_SIMPLE_PROMPT = true;  // Start with simple prompt to verify basic flow
  const prompt = USE_SIMPLE_PROMPT ? simplePrompt : realPrompt;

  console.log('Using:', USE_SIMPLE_PROMPT ? 'SIMPLE prompt' : 'REAL prompt');
  console.log('Prompt built, length:', prompt.length);
  console.log('Prompt preview:', prompt.slice(0, 200) + '...');

  // Simulate the debug output that handleStartEngineeringWorkflow adds
  appendOutputRef.current('Starting engineering workflow...\n');
  appendOutputRef.current(`[Debug] Working directory: ${projectDir}\n`);
  appendOutputRef.current(`[Debug] Spawning claude with prompt (${prompt.length} chars)...\n`);

  // Spawn Claude
  console.log('\n--- Spawning Claude ---');
  try {
    claudeRunnerRef.current.spawn(prompt, {
      cwd: projectDir,
    });
    appendOutputRef.current('[Debug] Spawn initiated\n');
  } catch (error) {
    console.log('Spawn error:', error);
    appendOutputRef.current(`[Error] Failed to spawn: ${error}\n`);
  }

  // 5. Wait and observe
  console.log('\n--- Waiting for output (90 seconds max) ---');

  const startTime = Date.now();
  const maxWait = 90000;

  while (exitCode === null && Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Waiting... (${Math.floor((Date.now() - startTime) / 1000)}s, outputs: ${outputs.length})`);
  }

  // 6. Report results
  console.log('\n=== Results ===');
  console.log('Exit code:', exitCode);
  console.log('Total outputs:', outputs.length);
  console.log('\nAll outputs:');
  outputs.forEach((out, i) => {
    console.log(`  [${i}]: ${out.slice(0, 100).replace(/\n/g, '\\n')}`);
  });

  // Cleanup
  console.log('\n--- Cleanup ---');
  if (claudeRunnerRef.current) {
    claudeRunnerRef.current.removeAllListeners();
    claudeRunnerRef.current.kill();
    unregisterRunner(claudeRunnerRef.current);
  }

  console.log('\n=== Test Complete ===');
}

testTUIIntegration().catch(console.error);
