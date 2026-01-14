/**
 * HelpModal Component
 *
 * Displays keyboard shortcuts and help text as a modal overlay.
 *
 * Features:
 * - Lists all keyboard shortcuts with descriptions
 * - Escape key closes the modal (handled by parent via onClose callback)
 * - Overlays on top of the Dashboard
 *
 * Visual design:
 * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 * ┃  Help - Keyboard Shortcuts                     ┃
 * ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 * ┃  Navigation                                    ┃
 * ┃    ↑/↓    Navigate task list                   ┃
 * ┃    Enter  Start/select                         ┃
 * ┃                                                ┃
 * ┃  Workflow Control                              ┃
 * ┃    p      Pause workflow                       ┃
 * ┃    r      Resume workflow                      ┃
 * ┃                                                ┃
 * ┃  General                                       ┃
 * ┃    s      Open story picker                    ┃
 * ┃    q      Quit                                 ┃
 * ┃    ?      Toggle this help                     ┃
 * ┃    Esc    Close modal                          ┃
 * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HelpModalProps {
  /** Callback when the modal should be closed (Escape pressed) */
  onClose: () => void;
}

/**
 * Keyboard shortcut definition.
 */
interface Shortcut {
  key: string;
  description: string;
}

/**
 * Group of related shortcuts.
 */
interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

/**
 * All keyboard shortcuts organized by category.
 */
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: '↑/↓', description: 'Navigate task list' },
      { key: 'Enter', description: 'Start workflow / Select story' },
      { key: 'PgUp/PgDn', description: 'Scroll output panel' },
    ],
  },
  {
    title: 'Workflow Control',
    shortcuts: [
      { key: 'p', description: 'Pause workflow (finish current task, then stop)' },
      { key: 'r', description: 'Resume / Start workflow' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { key: 's', description: 'Open story picker' },
      { key: 'q', description: 'Quit application' },
      { key: '?', description: 'Toggle this help' },
      { key: 'Esc', description: 'Close modal / Cancel' },
    ],
  },
];

/**
 * Renders a single shortcut row.
 */
function ShortcutRow({ shortcut }: { shortcut: Shortcut }): React.ReactElement {
  return (
    <Box>
      <Box width={12}>
        <Text color="cyan">{shortcut.key}</Text>
      </Box>
      <Text>{shortcut.description}</Text>
    </Box>
  );
}

/**
 * Renders a group of shortcuts with a title.
 */
function ShortcutGroupDisplay({ group }: { group: ShortcutGroup }): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">{group.title}</Text>
      <Box flexDirection="column" paddingLeft={2}>
        {group.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.key} shortcut={shortcut} />
        ))}
      </Box>
    </Box>
  );
}

/**
 * HelpModal displays keyboard shortcuts and help text.
 *
 * Renders as a bordered box that overlays the main content.
 * Key handling (Escape to close) is done by the parent component.
 */
export function HelpModal({ onClose: _onClose }: HelpModalProps): React.ReactElement {
  // Note: onClose callback is provided for the interface but actual key handling
  // is done by the parent App component. We suppress the unused variable warning.
  void _onClose;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      marginX={2}
      marginY={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Help - Keyboard Shortcuts</Text>
      </Box>

      {/* Shortcut groups */}
      {SHORTCUT_GROUPS.map((group) => (
        <ShortcutGroupDisplay key={group.title} group={group} />
      ))}

      {/* Footer hint */}
      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
        <Text dimColor>Press Esc or ? to close this help</Text>
      </Box>
    </Box>
  );
}
