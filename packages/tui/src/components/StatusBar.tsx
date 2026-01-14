/**
 * StatusBar Component
 *
 * Displays keyboard hints and task timer at the bottom of the dashboard.
 *
 * Features:
 * - Keyboard hints: [p]ause, [r]esume, [s]tory, [q]uit, [?]help
 * - Enables/disables hints based on state (e.g., pause only when running)
 * - Shows task timer when a task is executing
 * - Timer updates every second via the useTimer hook
 *
 * Visual design (from design.md):
 *   [p]ause [r]esume [s]tory [q]uit [?]help    Task: 00:02:34
 */

import React from 'react';
import { Box, Text } from 'ink';
import { formatTimerDisplay } from '../utils/formatting';
import type { KeyHint } from '../types';

interface StatusBarProps {
  /** Whether a workflow is currently running */
  isRunning: boolean;
  /** Whether the workflow is paused */
  isPaused: boolean;
  /** ID of the currently active task, or null if none */
  currentTaskId: string | null;
  /** Elapsed time in seconds for the current task */
  elapsedSeconds: number;
}

/**
 * Builds the list of keyboard hints based on current state.
 */
function buildKeyHints(isRunning: boolean, isPaused: boolean): KeyHint[] {
  return [
    {
      key: 'p',
      label: 'pause',
      // Pause is enabled when running and not already paused
      enabled: isRunning && !isPaused,
    },
    {
      key: 'r',
      label: 'resume',
      // Resume is enabled when paused OR when not running (to start)
      enabled: isPaused || !isRunning,
    },
    {
      key: 's',
      label: 'story',
      // Story picker is always available
      enabled: true,
    },
    {
      key: 'q',
      label: 'quit',
      // Quit is always available
      enabled: true,
    },
    {
      key: '?',
      label: 'help',
      // Help is always available
      enabled: true,
    },
  ];
}

/**
 * Renders a single keyboard hint.
 */
function KeyHintDisplay({ hint }: { hint: KeyHint }): React.ReactElement {
  return (
    <Text dimColor={!hint.enabled}>
      [<Text color={hint.enabled ? 'cyan' : undefined}>{hint.key}</Text>]
      {hint.label}
    </Text>
  );
}

/**
 * StatusBar displays keyboard hints and task timer at the bottom of the dashboard.
 */
export function StatusBar({
  isRunning,
  isPaused,
  currentTaskId,
  elapsedSeconds,
}: StatusBarProps): React.ReactElement {
  const keyHints = buildKeyHints(isRunning, isPaused);
  const timerDisplay = formatTimerDisplay(elapsedSeconds);

  return (
    <Box paddingX={1} justifyContent="space-between">
      {/* Left side: keyboard hints */}
      <Box>
        {keyHints.map((hint) => (
          <Box key={hint.key} marginRight={1}>
            <KeyHintDisplay hint={hint} />
          </Box>
        ))}

        {/* Status indicator */}
        {isPaused && (
          <Text color="yellow" bold>
            {' '}PAUSED
          </Text>
        )}
      </Box>

      {/* Right side: task timer */}
      <Box>
        {currentTaskId && isRunning && (
          <Text>
            <Text bold>Task {currentTaskId}:</Text> {timerDisplay}
          </Text>
        )}
      </Box>
    </Box>
  );
}
