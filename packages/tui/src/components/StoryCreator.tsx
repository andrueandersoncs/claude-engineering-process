/**
 * StoryCreator component - inline text input for creating new stories.
 *
 * Renders a text input for entering a story title. Supports:
 * - Enter to submit the title
 * - Escape to cancel
 * - Error message display in red
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface StoryCreatorProps {
  /** Callback when user submits a title (Enter pressed) */
  onSubmit: (title: string) => void;
  /** Callback when user cancels (Escape pressed) */
  onCancel: () => void;
  /** Error message to display (empty title, duplicate, etc.) */
  error?: string | null;
}

/**
 * StoryCreator renders an inline text input for story title entry.
 *
 * Features:
 * - Text input with visual cursor
 * - Enter submits the current input value
 * - Escape cancels and returns to previous view
 * - Displays error messages in red when provided
 */
export function StoryCreator({
  onSubmit,
  onCancel,
  error,
}: StoryCreatorProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('');

  useInput((input, key) => {
    // Handle Escape - cancel
    if (key.escape) {
      onCancel();
      return;
    }

    // Handle Enter - submit
    if (key.return) {
      onSubmit(inputValue);
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }

    // Ignore control characters and arrow keys
    if (key.ctrl || key.meta || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      return;
    }

    // Append regular characters
    if (input) {
      setInputValue((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title label */}
      <Box>
        <Text bold color="cyan">Story title: </Text>
        <Text>{inputValue}</Text>
        <Text color="gray">█</Text>
      </Box>

      {/* Error message */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Keyboard hints */}
      <Box marginTop={1}>
        <Text dimColor>Enter to submit, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
