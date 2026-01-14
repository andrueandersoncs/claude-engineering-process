/**
 * E2E Test: TUI Workflow
 *
 * Tests that the TUI can launch, load a story, and display the dashboard.
 * This test is written FIRST (TDD) and should FAIL until implementation exists.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TUI Workflow E2E', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temp project with test story
    tempDir = await mkdtemp(join(tmpdir(), 'tui-test-'));
    await mkdir(join(tempDir, 'docs/stories/test-story'), { recursive: true });

    // Create workflow-state.json
    await writeFile(
      join(tempDir, 'docs/stories/test-story/workflow-state.json'),
      JSON.stringify({
        story: 'Test Story',
        slug: 'test-story',
        source: 'direct',
        currentPhase: 'implement',
        completedPhases: ['understand', 'research', 'scope', 'design', 'decompose'],
        startedAt: new Date().toISOString(),
      })
    );

    // Create tasks.md
    await writeFile(
      join(tempDir, 'docs/stories/test-story/tasks.md'),
      `# Tasks: Test Story

## Phase 1: Foundation

- [ ] **Task 1.1**: First task
  - **Description**: This is the first task
  - **Files**: \`src/index.ts\`
  - **Done when**: Test passes
  - **Dependencies**: None

---

- [x] **Task 1.2**: Second task
  - **Description**: This is the second task
  - **Done when**: Test passes
  - **Dependencies**: Task 1.1
`
    );
  });

  afterAll(async () => {
    // Clean up temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('launches and displays story', async () => {
    // Get the path to the TUI binary
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    // Launch TUI in headless mode for testing
    // This spawns the TUI binary with --headless flag which should
    // render once and exit with the output
    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--story', 'test-story',
      '--headless',
    ], {
      timeout: 10000,
      reject: false, // Don't throw on non-zero exit
    });

    // The TUI should display the story slug
    expect(result.stdout).toContain('test-story');

    // The TUI should display the current phase
    expect(result.stdout).toContain('implement');

    // The TUI should exit successfully in headless mode
    expect(result.exitCode).toBe(0);
  });

  it('displays phase progress indicator', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--story', 'test-story',
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should show phase numbers (1-7)
    // The current phase (implement = 6) should be highlighted
    expect(result.stdout).toMatch(/6.*implement|implement.*6|\[6\]/i);
  });

  it('displays task list with status indicators', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--story', 'test-story',
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should display task identifiers
    expect(result.stdout).toContain('1.1');
    expect(result.stdout).toContain('1.2');

    // Should show status indicators (incomplete [ ] and complete [x])
    expect(result.stdout).toMatch(/\[[ x~]\]/);
  });

  it('handles missing story gracefully', async () => {
    const tuiBinPath = join(__dirname, '../../bin/ep-tui.js');

    const result = await execa('node', [
      tuiBinPath,
      '--project', tempDir,
      '--story', 'nonexistent-story',
      '--headless',
    ], {
      timeout: 10000,
      reject: false,
    });

    // Should exit with error code
    expect(result.exitCode).not.toBe(0);

    // Should show an error message
    expect(result.stdout + result.stderr).toMatch(/not found|error|invalid/i);
  });
});
