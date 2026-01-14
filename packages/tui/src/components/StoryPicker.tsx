/**
 * StoryPicker component - modal for selecting stories.
 *
 * Displays a list of available stories from docs/stories/ directory,
 * showing phase and task progress for each. Stories are sorted by
 * last modified time (most recent first).
 *
 * Features:
 * - Lists all stories with phase and task progress
 * - Arrow keys navigate the list
 * - Enter selects, Escape cancels
 * - Shows empty state when no stories exist
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { StoryInfo, Phase } from '../types';
import { drawProgressBar, calculatePercentage, truncate } from '../utils/formatting';
import { PHASES } from '../utils/constants';
import { StoryCreator } from './StoryCreator';

interface StoryPickerProps {
  /** List of available stories */
  stories: StoryInfo[];
  /** Index of the currently selected story */
  selectedIndex: number;
  /** Callback when a story is selected (Enter pressed) */
  onSelect: (slug: string) => void;
  /** Callback when selection is cancelled (Escape pressed) */
  onCancel: () => void;
  /** Maximum height for the story list (for scrolling) */
  maxHeight?: number;
  /** Whether currently in story creation mode */
  isCreating?: boolean;
  /** Callback when user submits a new story title */
  onSubmitCreate?: (title: string) => void;
  /** Callback when user cancels story creation */
  onCancelCreate?: () => void;
  /** Error message to display in story creation mode */
  createError?: string | null;
}

/**
 * Get the phase number (1-7) for a given phase.
 */
function getPhaseNumber(phase: Phase): number {
  const index = PHASES.indexOf(phase);
  return index >= 0 ? index + 1 : 0;
}

/**
 * Story item component - renders a single story in the list.
 */
function StoryItem({
  story,
  isSelected,
}: {
  story: StoryInfo;
  isSelected: boolean;
}): React.ReactElement {
  const phaseNum = getPhaseNumber(story.phase);
  const progress = calculatePercentage(story.tasksComplete, story.tasksTotal);
  const progressBar = drawProgressBar(story.tasksComplete, story.tasksTotal, 10);

  return (
    <Box flexDirection="column" paddingLeft={isSelected ? 0 : 2}>
      <Box>
        {/* Selection indicator */}
        <Text color={isSelected ? 'cyan' : undefined}>
          {isSelected ? '> ' : '  '}
        </Text>

        {/* Story slug */}
        <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
          {truncate(story.slug, 30)}
        </Text>
      </Box>

      {/* Story details */}
      <Box paddingLeft={4}>
        <Text dimColor={!isSelected}>
          Phase: {phaseNum}/7 ({story.phase})
        </Text>
        <Text> | </Text>
        <Text dimColor={!isSelected}>
          Tasks: {progressBar} {progress}% ({story.tasksComplete}/{story.tasksTotal})
        </Text>
      </Box>
    </Box>
  );
}

/**
 * StoryPicker displays a list of available stories for selection.
 *
 * Shows each story's slug, current phase, and task progress.
 * Supports keyboard navigation and scrolling for long lists.
 */
export function StoryPicker({
  stories,
  selectedIndex,
  onSelect: _onSelect,
  onCancel: _onCancel,
  maxHeight,
  isCreating = false,
  onSubmitCreate,
  onCancelCreate,
  createError,
}: StoryPickerProps): React.ReactElement {
  // Note: onSelect and onCancel callbacks are provided for the interface
  // but actual key handling is done by the parent App component via
  // useKeyboard hook (Task 5.1). We suppress the unused variable warning.
  void _onSelect;
  void _onCancel;

  // Render StoryCreator when in creation mode
  if (isCreating && onSubmitCreate && onCancelCreate) {
    return (
      <StoryCreator
        onSubmit={onSubmitCreate}
        onCancel={onCancelCreate}
        error={createError}
      />
    );
  }

  // Handle empty stories list
  if (stories.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">Select a Story</Text>
        <Box marginTop={1}>
          <Text dimColor>No stories found in docs/stories/</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="green">+ Create New Story [n]</Text>
        </Box>
      </Box>
    );
  }

  // Clamp selectedIndex to valid range
  const clampedIndex = Math.max(0, Math.min(selectedIndex, stories.length - 1));

  // Calculate visible window for scrolling
  let visibleStories = stories;
  let startIndex = 0;

  // Each story takes 2 lines (title + details), so adjust maxHeight
  const effectiveMaxItems = maxHeight ? Math.floor(maxHeight / 2) : undefined;

  if (effectiveMaxItems && effectiveMaxItems > 0 && stories.length > effectiveMaxItems) {
    const halfWindow = Math.floor(effectiveMaxItems / 2);
    startIndex = Math.max(0, clampedIndex - halfWindow);

    if (startIndex + effectiveMaxItems > stories.length) {
      startIndex = Math.max(0, stories.length - effectiveMaxItems);
    }

    visibleStories = stories.slice(startIndex, startIndex + effectiveMaxItems);
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Text bold color="cyan">Select a Story</Text>
      <Box marginTop={1} marginBottom={1}>
        <Text dimColor>Use ↑/↓ to navigate, Enter to select, n for new, Esc to cancel</Text>
      </Box>

      {/* Create new story option */}
      <Box marginBottom={1}>
        <Text color="green">+ Create New Story [n]</Text>
      </Box>

      {/* Scroll indicator at top */}
      {startIndex > 0 && (
        <Text dimColor>  ▲ ({startIndex} more above)</Text>
      )}

      {/* Story list */}
      {visibleStories.map((story, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === clampedIndex;

        return (
          <Box key={story.slug} marginY={0}>
            <StoryItem story={story} isSelected={isSelected} />
          </Box>
        );
      })}

      {/* Scroll indicator at bottom */}
      {effectiveMaxItems &&
        effectiveMaxItems > 0 &&
        startIndex + effectiveMaxItems < stories.length && (
          <Text dimColor>
            {'  '}▼ ({stories.length - startIndex - effectiveMaxItems} more below)
          </Text>
        )}
    </Box>
  );
}
