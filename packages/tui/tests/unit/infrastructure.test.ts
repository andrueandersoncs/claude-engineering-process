/**
 * Infrastructure verification test.
 * This test verifies that the test infrastructure is properly configured.
 * It will be removed or expanded once real tests are added.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

describe('Test Infrastructure', () => {
  it('can load workflow-state.json fixture', () => {
    const content = readFileSync(join(fixturesDir, 'workflow-state.json'), 'utf-8');
    const state = JSON.parse(content);

    expect(state).toHaveProperty('story');
    expect(state).toHaveProperty('slug');
    expect(state).toHaveProperty('currentPhase');
    expect(state).toHaveProperty('completedPhases');
    expect(state).toHaveProperty('startedAt');
    expect(state.currentPhase).toBe('implement');
    expect(state.completedPhases).toContain('understand');
  });

  it('can load tasks.md fixture', () => {
    const content = readFileSync(join(fixturesDir, 'tasks.md'), 'utf-8');

    expect(content).toContain('# Tasks: Test Story');
    expect(content).toContain('Task 1.1');
    expect(content).toContain('Task 1.2');
    expect(content).toContain('Task 2.1');
    expect(content).toContain('Task 2.2');
  });

  it('tasks.md fixture has valid task status markers', () => {
    const content = readFileSync(join(fixturesDir, 'tasks.md'), 'utf-8');

    // Verify task status markers exist (required for taskParser)
    expect(content).toMatch(/- \[ \] \*\*Task/); // incomplete task
    expect(content).toMatch(/- \[x\] \*\*Task/); // complete task
    expect(content).toMatch(/- \[~\] \*\*Task/); // in_progress task
  });

  it('fixtures match expected schema', () => {
    const content = readFileSync(join(fixturesDir, 'workflow-state.json'), 'utf-8');
    const state = JSON.parse(content);

    // Verify schema matches design.md WorkflowState interface
    expect(typeof state.story).toBe('string');
    expect(typeof state.slug).toBe('string');
    expect(typeof state.source).toBe('string');
    expect(Array.isArray(state.completedPhases)).toBe(true);
    expect(typeof state.startedAt).toBe('string');

    // Verify phase values are valid
    const validPhases = ['understand', 'research', 'scope', 'design', 'decompose', 'implement', 'validate'];
    expect(validPhases).toContain(state.currentPhase);
    for (const phase of state.completedPhases) {
      expect(validPhases).toContain(phase);
    }
  });
});
