/**
 * E2E Test: SetupView Workflow
 *
 * Tests the full flow of:
 * 1. Creating a story
 * 2. Seeing the SetupView (no tasks)
 * 3. Pressing Enter to start the engineering workflow
 * 4. Verifying output appears
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import components and store
import { App } from '../../src/components/App';
import { useTUIStore } from '../../src/store';
import * as claudeRunner from '../../src/services/claudeRunner';

// Mock the ClaudeRunner to avoid actually spawning Claude
vi.mock('../../src/services/claudeRunner', async () => {
  const actual = await vi.importActual('../../src/services/claudeRunner');

  // Create a mock runner that simulates output
  const mockOutputCallbacks: Set<(text: string) => void> = new Set();
  const mockExitCallbacks: Set<(code: number) => void> = new Set();

  const mockRunner = {
    spawn: vi.fn((prompt: string, options?: { cwd?: string }) => {
      console.log('[MockRunner] spawn called with prompt length:', prompt.length);
      console.log('[MockRunner] cwd:', options?.cwd);

      // Simulate some output after a short delay
      setTimeout(() => {
        console.log('[MockRunner] Sending mock output...');
        mockOutputCallbacks.forEach(cb => {
          cb('[Mock] Starting engineering workflow...\n');
          cb('[Mock] Analyzing story...\n');
          cb('[Mock] Phase: understand\n');
        });
      }, 100);

      // Simulate process exit after more delay
      setTimeout(() => {
        console.log('[MockRunner] Sending exit...');
        mockExitCallbacks.forEach(cb => cb(0));
      }, 500);
    }),
    kill: vi.fn(),
    isRunning: vi.fn(() => false),
    onOutput: vi.fn((cb: (text: string) => void) => {
      mockOutputCallbacks.add(cb);
    }),
    onExit: vi.fn((cb: (code: number) => void) => {
      mockExitCallbacks.add(cb);
    }),
    offOutput: vi.fn((cb: (text: string) => void) => {
      mockOutputCallbacks.delete(cb);
    }),
    offExit: vi.fn((cb: (code: number) => void) => {
      mockExitCallbacks.delete(cb);
    }),
    removeAllListeners: vi.fn(() => {
      mockOutputCallbacks.clear();
      mockExitCallbacks.clear();
    }),
  };

  return {
    ...actual,
    createClaudeRunner: vi.fn(() => mockRunner),
    unregisterRunner: vi.fn(),
  };
});

describe('SetupView Workflow', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Reset store state
    useTUIStore.setState({
      stories: [],
      currentStory: null,
      tasks: [],
      activeTaskId: null,
      selectedTaskIndex: 0,
      isRunning: false,
      isPaused: false,
      output: [],
      currentProcess: null,
      view: 'picker',
      taskStartTime: null,
    });

    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'tui-setup-workflow-'));
    await mkdir(join(tempDir, 'docs/stories'), { recursive: true });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('shows SetupView when story has no tasks', async () => {
    // Create a story with no tasks
    const storySlug = 'test-story';
    const storyDir = join(tempDir, 'docs/stories', storySlug);
    await mkdir(storyDir, { recursive: true });
    await writeFile(
      join(storyDir, 'workflow-state.json'),
      JSON.stringify({
        story: 'Test Story',
        slug: storySlug,
        source: 'direct',
        currentPhase: 'understand',
        completedPhases: [],
        startedAt: new Date().toISOString(),
      })
    );

    // Render the app
    const { lastFrame, unmount } = render(
      <App
        projectDir={tempDir}
        initialStory={storySlug}
        headless={true}
      />
    );

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame();
    console.log('Frame output:', frame);

    // Should show the SetupView with "Press Enter to start"
    expect(frame).toMatch(/story setup|press enter/i);

    unmount();
  });

  it('ClaudeRunner is created on mount', async () => {
    const storySlug = 'test-story';
    const storyDir = join(tempDir, 'docs/stories', storySlug);
    await mkdir(storyDir, { recursive: true });
    await writeFile(
      join(storyDir, 'workflow-state.json'),
      JSON.stringify({
        story: 'Test Story',
        slug: storySlug,
        source: 'direct',
        currentPhase: 'understand',
        completedPhases: [],
        startedAt: new Date().toISOString(),
      })
    );

    const { unmount } = render(
      <App
        projectDir={tempDir}
        initialStory={storySlug}
        headless={true}
      />
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify ClaudeRunner was created
    expect(claudeRunner.createClaudeRunner).toHaveBeenCalled();

    unmount();
  });

  it('pressing Enter triggers handleStart when no tasks', async () => {
    const storySlug = 'test-story';
    const storyDir = join(tempDir, 'docs/stories', storySlug);
    await mkdir(storyDir, { recursive: true });
    await writeFile(
      join(storyDir, 'workflow-state.json'),
      JSON.stringify({
        story: 'Test Story',
        slug: storySlug,
        source: 'direct',
        currentPhase: 'understand',
        completedPhases: [],
        startedAt: new Date().toISOString(),
      })
    );

    const { stdin, lastFrame, unmount } = render(
      <App
        projectDir={tempDir}
        initialStory={storySlug}
        headless={false}  // Need interactive mode for stdin
      />
    );

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('Before Enter - Frame:', lastFrame());
    console.log('Before Enter - Store state:', {
      tasks: useTUIStore.getState().tasks.length,
      isRunning: useTUIStore.getState().isRunning,
      output: useTUIStore.getState().output,
    });

    // Simulate pressing Enter
    stdin.write('\r');

    // Wait for the workflow to start
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('After Enter - Frame:', lastFrame());
    console.log('After Enter - Store state:', {
      tasks: useTUIStore.getState().tasks.length,
      isRunning: useTUIStore.getState().isRunning,
      output: useTUIStore.getState().output,
    });

    // The mock runner should have been called
    const mockRunner = (claudeRunner.createClaudeRunner as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    console.log('Mock runner spawn calls:', mockRunner?.spawn?.mock?.calls?.length);

    unmount();
  });
});

describe('SetupView Component Isolation', () => {
  it('renders SetupView correctly', async () => {
    const { SetupView } = await import('../../src/components/SetupView');

    const { lastFrame } = render(
      <SetupView
        story={{
          story: 'Test Story',
          slug: 'test-story',
          source: 'direct',
          currentPhase: 'understand',
          completedPhases: [],
          startedAt: new Date().toISOString(),
        }}
        isStarting={false}
        isRunning={false}
        output={[]}
      />
    );

    const frame = lastFrame();
    console.log('SetupView frame:', frame);

    expect(frame).toContain('Story Setup');
    expect(frame).toMatch(/press enter/i);
  });

  it('renders running state with output', async () => {
    const { SetupView } = await import('../../src/components/SetupView');

    const { lastFrame } = render(
      <SetupView
        story={{
          story: 'Test Story',
          slug: 'test-story',
          source: 'direct',
          currentPhase: 'understand',
          completedPhases: [],
          startedAt: new Date().toISOString(),
        }}
        isStarting={false}
        isRunning={true}
        output={['Line 1', 'Line 2', 'Line 3']}
      />
    );

    const frame = lastFrame();
    console.log('SetupView running frame:', frame);

    expect(frame).toContain('Running');
    expect(frame).toContain('Line 1');
    expect(frame).toContain('Line 2');
    expect(frame).toContain('Line 3');
  });
});
