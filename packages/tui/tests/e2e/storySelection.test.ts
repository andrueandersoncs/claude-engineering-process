/**
 * E2E Test: Story Selection
 *
 * Tests that the TUI displays a story picker when multiple stories are available.
 * This test is written FIRST (TDD) and should FAIL until implementation exists.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TUI Story Selection E2E', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temp project with multiple test stories
    tempDir = await mkdtemp(join(tmpdir(), 'tui-story-selection-'));

    // Create first story: auth-feature (in implement phase)
    await mkdir(join(tempDir, 'docs/stories/auth-feature'), { recursive: true });
    await writeFile(
      join(tempDir, 'docs/stories/auth-feature/workflow-state.json'),
      JSON.stringify({
        story: 'Add Authentication Feature',
        slug: 'auth-feature',
        source: 'direct',
        currentPhase: 'implement',
        completedPhases: ['understand', 'research', 'scope', 'design', 'decompose'],
        startedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      })
    );
    await writeFile(
      join(tempDir, 'docs/stories/auth-feature/tasks.md'),
      `# Tasks: Auth Feature

## Phase 1: Setup

- [x] **Task 1.1**: Setup auth module
  - **Done when**: Auth module exists

- [ ] **Task 1.2**: Add login endpoint
  - **Done when**: Login works
`
    );

    // Create second story: dark-mode (in design phase)
    await mkdir(join(tempDir, 'docs/stories/dark-mode'), { recursive: true });
    await writeFile(
      join(tempDir, 'docs/stories/dark-mode/workflow-state.json'),
      JSON.stringify({
        story: 'Implement Dark Mode',
        slug: 'dark-mode',
        source: 'github',
        currentPhase: 'design',
        completedPhases: ['understand', 'research', 'scope'],
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
    );
    await writeFile(
      join(tempDir, 'docs/stories/dark-mode/tasks.md'),
      `# Tasks: Dark Mode

## Phase 1: Theme Setup

- [ ] **Task 1.1**: Create theme provider
  - **Done when**: Theme provider component exists
`
    );

    // Create third story: api-refactor (in validate phase)
    await mkdir(join(tempDir, 'docs/stories/api-refactor'), { recursive: true });
    await writeFile(
      join(tempDir, 'docs/stories/api-refactor/workflow-state.json'),
      JSON.stringify({
        story: 'Refactor API Layer',
        slug: 'api-refactor',
        source: 'direct',
        currentPhase: 'validate',
        completedPhases: ['understand', 'research', 'scope', 'design', 'decompose', 'implement'],
        startedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      })
    );
    await writeFile(
      join(tempDir, 'docs/stories/api-refactor/tasks.md'),
      `# Tasks: API Refactor

## Phase 1: Cleanup

- [x] **Task 1.1**: Remove deprecated endpoints
  - **Done when**: Old endpoints removed

- [x] **Task 1.2**: Add new endpoints
  - **Done when**: New endpoints work
`
    );
  });

  afterAll(async () => {
    // Clean up temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('displays available stories when no story is specified', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    // Launch TUI without specifying a story - should show story picker
    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should display all three story slugs
    expect(result.stdout).toContain('auth-feature');
    expect(result.stdout).toContain('dark-mode');
    expect(result.stdout).toContain('api-refactor');
  });

  it('displays story list header or title', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should show a header indicating this is a story selection screen
    // Could be "Select a Story", "Stories", "Available Stories", etc.
    expect(result.stdout).toMatch(/stor(y|ies)|select/i);
  });

  it('displays phase information for each story', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should show phase indicators for stories
    // auth-feature is in implement, dark-mode in design, api-refactor in validate
    expect(result.stdout).toMatch(/implement/i);
    expect(result.stdout).toMatch(/design/i);
    expect(result.stdout).toMatch(/validate/i);
  });

  it('displays task progress for each story', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should show task counts or progress indicators
    // auth-feature: 1/2, dark-mode: 0/1, api-refactor: 2/2
    // Could be displayed as "1/2", "50%", progress bars, etc.
    expect(result.stdout).toMatch(/\d+[\/\%]|\d+ of \d+|task/i);
  });

  it('shows empty state when no stories exist', async () => {
    // Create a new empty temp directory
    const emptyDir = await mkdtemp(join(tmpdir(), 'tui-empty-'));
    await mkdir(join(emptyDir, 'docs/stories'), { recursive: true });

    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    try {
      const result = await execa('node', [
        tuiBinPath,
        '--project', emptyDir,
        '--headless',
      ], {
        timeout: 10000,
        reject: false,
      });

      // Should indicate no stories are available
      // Could show "No stories found", "No stories", empty state message, etc.
      expect(result.stdout + result.stderr).toMatch(/no stor(y|ies)|empty|not found|none/i);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('allows selecting a story by slug', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    // When a specific story is provided, should jump directly to that story's dashboard
    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--story', 'dark-mode',
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should display the selected story's dashboard, not the picker
    expect(result.stdout).toContain('dark-mode');
    expect(result.stdout).toContain('design');

    // Should exit successfully
    expect(result.exitCode).toBe(0);
  });
});
