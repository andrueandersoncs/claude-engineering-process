/**
 * Component tests for PhaseProgress using ink-testing-library.
 *
 * These tests verify the PhaseProgress component renders the 8-phase workflow
 * indicator correctly, highlighting the current phase and showing completed phases.
 *
 * Following TDD principles, these tests are written BEFORE the implementation exists,
 * so they will FAIL initially.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';

// Import the component under test - this will fail until implementation exists
import { PhaseProgress } from '../../src/components/PhaseProgress';

// Type for Phase (matches design.md)
type Phase =
  | 'understand'
  | 'research'
  | 'scope'
  | 'design'
  | 'decompose'
  | 'implement'
  | 'validate'
  | 'deploy';

// All 8 phases in order
const ALL_PHASES: Phase[] = [
  'understand',
  'research',
  'scope',
  'design',
  'decompose',
  'implement',
  'validate',
  'deploy',
];

describe('PhaseProgress', () => {
  describe('rendering all phases', () => {
    it('renders all 8 phases', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="understand"
          completedPhases={[]}
        />
      );

      const output = lastFrame();
      // Should contain phase numbers 1 through 8
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
      expect(output).toContain('4');
      expect(output).toContain('5');
      expect(output).toContain('6');
      expect(output).toContain('7');
      expect(output).toContain('8');
    });

    it('renders phases in correct order (1-8)', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="understand"
          completedPhases={[]}
        />
      );

      const output = lastFrame() ?? '';
      // Find positions of each number
      const pos1 = output.indexOf('1');
      const pos2 = output.indexOf('2');
      const pos3 = output.indexOf('3');
      const pos4 = output.indexOf('4');
      const pos5 = output.indexOf('5');
      const pos6 = output.indexOf('6');
      const pos7 = output.indexOf('7');
      const pos8 = output.indexOf('8');

      // Verify order
      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
      expect(pos3).toBeLessThan(pos4);
      expect(pos4).toBeLessThan(pos5);
      expect(pos5).toBeLessThan(pos6);
      expect(pos6).toBeLessThan(pos7);
      expect(pos7).toBeLessThan(pos8);
    });
  });

  describe('highlighting current phase', () => {
    it('highlights current phase with brackets when on first phase', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="understand"
          completedPhases={[]}
        />
      );

      // Current phase (1 = understand) should be bracketed
      expect(lastFrame()).toContain('[1]');
    });

    it('highlights current phase with brackets when on middle phase', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="design"
          completedPhases={['understand', 'research', 'scope']}
        />
      );

      // Current phase (4 = design) should be bracketed
      expect(lastFrame()).toContain('[4]');
    });

    it('highlights current phase with brackets when on implement phase', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="implement"
          completedPhases={['understand', 'research', 'scope', 'design', 'decompose']}
        />
      );

      // Current phase (6 = implement) should be bracketed
      expect(lastFrame()).toContain('[6]');
    });

    it('highlights current phase with brackets when on last phase', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="deploy"
          completedPhases={[
            'understand',
            'research',
            'scope',
            'design',
            'decompose',
            'implement',
            'validate',
          ]}
        />
      );

      // Current phase (8 = deploy) should be bracketed
      expect(lastFrame()).toContain('[8]');
    });

    it('only brackets the current phase, not other phases', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="design"
          completedPhases={['understand', 'research', 'scope']}
        />
      );

      const output = lastFrame() ?? '';

      // Only phase 4 should be bracketed
      expect(output).toContain('[4]');
      // Other phases should not be bracketed
      expect(output).not.toContain('[1]');
      expect(output).not.toContain('[2]');
      expect(output).not.toContain('[3]');
      expect(output).not.toContain('[5]');
      expect(output).not.toContain('[6]');
      expect(output).not.toContain('[7]');
      expect(output).not.toContain('[8]');
    });
  });

  describe('showing completed phases', () => {
    it('shows completed phases distinctly from incomplete phases', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="design"
          completedPhases={['understand', 'research', 'scope']}
        />
      );

      // Output should exist and contain phase numbers
      const output = lastFrame();
      expect(output).toBeDefined();
      // Phases 1, 2, 3 are completed, 4 is current
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
      expect(output).toContain('[4]');
    });

    it('shows all phases as incomplete when none completed', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="understand"
          completedPhases={[]}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      // Only first phase should be bracketed (current)
      expect(output).toContain('[1]');
    });

    it('shows multiple completed phases', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="implement"
          completedPhases={['understand', 'research', 'scope', 'design', 'decompose']}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      // All completed phases (1-5) should be visible
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
      expect(output).toContain('4');
      expect(output).toContain('5');
      // Current phase (6) should be bracketed
      expect(output).toContain('[6]');
    });

    it('shows almost all phases completed when on last phase', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="deploy"
          completedPhases={[
            'understand',
            'research',
            'scope',
            'design',
            'decompose',
            'implement',
            'validate',
          ]}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      // Phases 1-7 completed, 8 is current
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
      expect(output).toContain('4');
      expect(output).toContain('5');
      expect(output).toContain('6');
      expect(output).toContain('7');
      expect(output).toContain('[8]');
    });
  });

  describe('edge cases', () => {
    it('handles empty completedPhases array', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="understand"
          completedPhases={[]}
        />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      expect(output).toContain('[1]');
    });

    it('handles validate phase as current', () => {
      const { lastFrame } = render(
        <PhaseProgress
          currentPhase="validate"
          completedPhases={[
            'understand',
            'research',
            'scope',
            'design',
            'decompose',
            'implement',
          ]}
        />
      );

      expect(lastFrame()).toContain('[7]');
    });

    it('handles each phase as current correctly', () => {
      // Test each phase can be the current phase
      ALL_PHASES.forEach((phase, index) => {
        const completedPhases = ALL_PHASES.slice(0, index) as Phase[];
        const { lastFrame } = render(
          <PhaseProgress
            currentPhase={phase}
            completedPhases={completedPhases}
          />
        );

        const expectedBracket = `[${index + 1}]`;
        expect(lastFrame()).toContain(expectedBracket);
      });
    });
  });
});
