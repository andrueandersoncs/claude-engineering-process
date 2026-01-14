/**
 * PhaseProgress component - displays the 8-phase workflow progress indicator.
 *
 * Renders all 8 phases horizontally with visual distinction:
 * - Completed phases: green
 * - Current phase: bracketed and cyan
 * - Future phases: dimmed
 *
 * Example output: 1 2 3 [4] 5 6 7 8
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Phase } from '../types';
import { PHASES } from '../utils/constants';

interface PhaseProgressProps {
  currentPhase: Phase;
  completedPhases: Phase[];
}

/**
 * PhaseProgress displays the 8-phase workflow progress indicator.
 *
 * Completed phases are shown in green, the current phase is bracketed
 * and highlighted in cyan, and future phases are dimmed.
 */
export function PhaseProgress({ currentPhase, completedPhases }: PhaseProgressProps): React.ReactElement {
  return (
    <Box>
      {PHASES.map((phase, index) => {
        const phaseNumber = index + 1;
        const isCompleted = completedPhases.includes(phase);
        const isCurrent = phase === currentPhase;

        // Determine styling based on phase state
        if (isCurrent) {
          // Current phase: bracketed and cyan
          return (
            <Text key={phase} color="cyan" bold>
              [{phaseNumber}]{index < PHASES.length - 1 ? ' ' : ''}
            </Text>
          );
        } else if (isCompleted) {
          // Completed phase: green
          return (
            <Text key={phase} color="green">
              {phaseNumber}{index < PHASES.length - 1 ? ' ' : ''}
            </Text>
          );
        } else {
          // Future phase: dimmed
          return (
            <Text key={phase} dimColor>
              {phaseNumber}{index < PHASES.length - 1 ? ' ' : ''}
            </Text>
          );
        }
      })}
    </Box>
  );
}
