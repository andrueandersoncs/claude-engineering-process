/**
 * OutputPanel component - displays streaming Claude output.
 *
 * Renders output lines from the store with support for:
 * - Auto-scrolling to bottom on new content
 * - ANSI color code preservation
 * - Manual scrolling with Page Up/Down
 * - Ring buffer limiting (handled by store, default 1000 lines)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';

/** Default maximum lines to display in the panel */
const DEFAULT_MAX_VISIBLE_LINES = 20;

interface OutputPanelProps {
  /** Output lines to display */
  lines: string[];
  /** Maximum number of lines visible at once (for scrolling) */
  maxVisibleLines?: number;
  /** Whether to auto-scroll to bottom on new content */
  autoScroll?: boolean;
  /** Whether this panel is focused for keyboard input */
  isFocused?: boolean;
}

/**
 * OutputPanel displays streaming output from Claude subprocess.
 *
 * Features:
 * - Renders all output lines with ANSI colors preserved
 * - Auto-scrolls to bottom when new content arrives (if enabled)
 * - Supports Page Up/Down for manual scrolling
 * - Shows scroll position indicators when not at bottom
 */
export function OutputPanel({
  lines,
  maxVisibleLines = DEFAULT_MAX_VISIBLE_LINES,
  autoScroll = true,
  isFocused = false,
}: OutputPanelProps): React.ReactElement {
  // Track scroll offset from bottom (0 = at bottom, positive = scrolled up)
  const [scrollOffset, setScrollOffset] = useState(0);

  // Track previous line count to detect new content
  const prevLineCountRef = useRef(lines.length);

  // Auto-scroll to bottom when new content arrives (if enabled)
  useEffect(() => {
    if (autoScroll && lines.length > prevLineCountRef.current) {
      // New content added, scroll to bottom
      setScrollOffset(0);
    }
    prevLineCountRef.current = lines.length;
  }, [lines.length, autoScroll]);

  // Handle keyboard input for manual scrolling
  useInput(
    (input, key) => {
      if (!isFocused) return;

      const pageSize = Math.max(1, maxVisibleLines - 2); // Leave some overlap

      if (key.pageUp) {
        // Scroll up (increase offset from bottom)
        setScrollOffset((prev) =>
          Math.min(prev + pageSize, Math.max(0, lines.length - maxVisibleLines))
        );
      } else if (key.pageDown) {
        // Scroll down (decrease offset from bottom)
        setScrollOffset((prev) => Math.max(0, prev - pageSize));
      } else if (input === 'g' && key.shift) {
        // Shift+G: Go to bottom
        setScrollOffset(0);
      } else if (input === 'g') {
        // g: Go to top
        setScrollOffset(Math.max(0, lines.length - maxVisibleLines));
      }
    },
    { isActive: isFocused }
  );

  // Handle empty state
  if (lines.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text dimColor>No output yet. Press Enter to start the workflow.</Text>
      </Box>
    );
  }

  // Calculate visible window
  const totalLines = lines.length;
  const effectiveMaxVisible = Math.min(maxVisibleLines, totalLines);

  // Calculate start and end indices
  // scrollOffset is distance from bottom, so we subtract it from the end
  const endIndex = totalLines - scrollOffset;
  const startIndex = Math.max(0, endIndex - effectiveMaxVisible);

  // Get visible lines
  const visibleLines = lines.slice(startIndex, endIndex);

  // Determine if we're at the bottom (auto-scroll active)
  const isAtBottom = scrollOffset === 0;

  // Calculate scroll indicators
  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = endIndex < totalLines;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Scroll indicator at top */}
      {hasMoreAbove && (
        <Text dimColor>
          {'  '}--- {startIndex} lines above (PgUp to scroll) ---
        </Text>
      )}

      {/* Output lines */}
      {visibleLines.map((line, index) => (
        <Text key={`${startIndex + index}-${line.slice(0, 20)}`}>{line}</Text>
      ))}

      {/* Scroll indicator at bottom */}
      {hasMoreBelow && (
        <Text dimColor>
          {'  '}--- {totalLines - endIndex} lines below (PgDn to scroll) ---
        </Text>
      )}

      {/* Auto-scroll indicator */}
      {!isAtBottom && (
        <Text dimColor italic>
          {'  '}[Auto-scroll paused - press G to go to bottom]
        </Text>
      )}
    </Box>
  );
}
