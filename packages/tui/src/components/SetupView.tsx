/**
 * SetupView Component
 *
 * Displayed when a story has been created but has no tasks yet.
 * Guides the user to start the engineering workflow which will
 * generate tasks through the 8-phase process.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { WorkflowState } from '../types';

/** Phase descriptions for the setup view */
const PHASE_DESCRIPTIONS: Record<string, string> = {
  understand: 'Comprehend requirements, identify gaps',
  research: 'Explore codebase, verify assumptions',
  scope: 'Define boundaries, minimal implementation',
  design: 'Architecture decisions, document approach',
  decompose: 'Break into implementable tasks',
  implement: 'Write code and tests',
  validate: 'Review, test, verify criteria',
  deploy: 'Release and monitor',
};

interface SetupViewProps {
  /** Current workflow state */
  story: WorkflowState;
  /** Whether the workflow is currently starting */
  isStarting?: boolean;
  /** Whether the workflow is running */
  isRunning?: boolean;
  /** Output lines from the workflow */
  output?: string[];
}

/**
 * SetupView shows guidance when a story has no tasks.
 *
 * This view appears after story creation and before the engineering
 * workflow has generated any tasks. It explains what will happen
 * and prompts the user to start the workflow.
 */
export function SetupView({
  story,
  isStarting = false,
  isRunning = false,
  output = [],
}: SetupViewProps): React.ReactElement {
  const currentPhaseDesc = PHASE_DESCRIPTIONS[story.currentPhase] ?? 'Unknown phase';
  const isActive = isStarting || isRunning;

  // When workflow is running, show compact view with output
  if (isActive) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        {/* Compact header */}
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Engineering Workflow
          </Text>
          <Text> - </Text>
          <Text color="yellow">{story.story}</Text>
        </Box>

        {/* Status */}
        <Box marginBottom={1}>
          <Text color="green">● Running</Text>
          <Text dimColor> - Phase: {story.currentPhase}</Text>
        </Box>

        {/* Output area */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          flexGrow={1}
          minHeight={10}
        >
          {output.length === 0 ? (
            <Text dimColor>Waiting for output...</Text>
          ) : (
            output.slice(-20).map((line, index) => (
              <Text key={index}>{line}</Text>
            ))
          )}
        </Box>

        {/* Hints */}
        <Box marginTop={1}>
          <Text dimColor>
            [q] Quit  [?] Help
          </Text>
        </Box>
      </Box>
    );
  }

  // Default: show setup instructions
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Story Setup
        </Text>
      </Box>

      {/* Story info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text dimColor>Story: </Text>
          <Text bold>{story.story}</Text>
        </Text>
        <Text>
          <Text dimColor>Slug: </Text>
          <Text>{story.slug}</Text>
        </Text>
        <Text>
          <Text dimColor>Phase: </Text>
          <Text color="yellow">{story.currentPhase}</Text>
          <Text dimColor> - {currentPhaseDesc}</Text>
        </Text>
      </Box>

      {/* Explanation */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text>
          This story needs to go through the engineering workflow to generate
          implementation tasks.
        </Text>
        <Text> </Text>
        <Text>The workflow will:</Text>
        <Text dimColor>  1. Analyze and understand the requirements</Text>
        <Text dimColor>  2. Research the codebase for context</Text>
        <Text dimColor>  3. Define the scope of work</Text>
        <Text dimColor>  4. Design the solution</Text>
        <Text dimColor>  5. Decompose into individual tasks</Text>
        <Text> </Text>
        <Text>
          Once tasks are generated, you can track progress and execute them
          from this dashboard.
        </Text>
      </Box>

      {/* Action prompt */}
      <Box>
        <Text>
          <Text color="green" bold>
            Press Enter
          </Text>
          <Text> to start the engineering workflow</Text>
        </Text>
      </Box>

      {/* Additional hints */}
      <Box marginTop={1}>
        <Text dimColor>
          [s] Switch story  [q] Quit  [?] Help
        </Text>
      </Box>
    </Box>
  );
}
