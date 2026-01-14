/**
 * Header Component
 *
 * Displays story information and progress at the top of the dashboard:
 * - Story slug and title
 * - Current phase and phase number (e.g., "Phase: 6/8 (implement)")
 * - PhaseProgress component showing all 8 phases
 * - Task progress bar with percentage
 *
 * Visual design (from design.md):
 *   Story: terminal-ui-implementation    Phase: 6/8 (implement)
 *   Progress: 1 2 3 4 5 [6] 7 8
 *   Tasks:    ████████████░░░░ 75% (12/16)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { PhaseProgress } from './PhaseProgress';
import { drawProgressBar, calculatePercentage } from '../utils/formatting';
import type { Phase } from '../types';
import { PHASES } from '../utils/constants';

interface HeaderProps {
  /** URL-safe slug for the story */
  storySlug: string;
  /** Human-readable story title */
  storyTitle: string;
  /** Current active phase */
  currentPhase: Phase;
  /** Array of completed phases */
  completedPhases: Phase[];
  /** Number of completed tasks */
  tasksComplete: number;
  /** Total number of tasks */
  tasksTotal: number;
}

/**
 * Header displays story information and progress indicators at the top
 * of the TUI dashboard.
 */
export function Header({
  storySlug,
  storyTitle,
  currentPhase,
  completedPhases,
  tasksComplete,
  tasksTotal,
}: HeaderProps): React.ReactElement {
  // Calculate phase number (1-indexed)
  const phaseIndex = PHASES.indexOf(currentPhase);
  const phaseNumber = phaseIndex === -1 ? 0 : phaseIndex + 1;
  const totalPhases = PHASES.length;

  // Calculate task progress
  const percentage = calculatePercentage(tasksComplete, tasksTotal);
  const progressBar = drawProgressBar(tasksComplete, tasksTotal, 16);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Row 1: Story info and phase indicator */}
      <Box>
        <Text>
          <Text bold>Story:</Text> {storySlug}{storyTitle && storyTitle !== storySlug ? ` (${storyTitle})` : ''}
        </Text>
        <Text>    </Text>
        <Text>
          <Text bold>Phase:</Text> {phaseNumber}/{totalPhases} ({currentPhase})
        </Text>
      </Box>

      {/* Row 2: Phase progress indicator */}
      <Box>
        <Text bold>Progress:</Text>
        <Text> </Text>
        <PhaseProgress currentPhase={currentPhase} completedPhases={completedPhases} />
      </Box>

      {/* Row 3: Task progress bar */}
      <Box>
        <Text bold>Tasks:</Text>
        <Text>    </Text>
        <Text color="green">{progressBar}</Text>
        <Text> {percentage}% ({tasksComplete}/{tasksTotal})</Text>
      </Box>
    </Box>
  );
}
