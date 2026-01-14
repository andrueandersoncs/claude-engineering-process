/**
 * StoryPicker Component Tests
 *
 * Tests for the StoryPicker modal component that displays available stories.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StoryPicker } from '../../src/components/StoryPicker';
import type { StoryInfo } from '../../src/types';

describe('StoryPicker', () => {
  // Test data
  const mockStories: StoryInfo[] = [
    {
      slug: 'auth-feature',
      title: 'Add Authentication Feature',
      phase: 'implement',
      tasksComplete: 5,
      tasksTotal: 10,
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      slug: 'dark-mode',
      title: 'Implement Dark Mode',
      phase: 'design',
      tasksComplete: 0,
      tasksTotal: 5,
      updatedAt: new Date('2024-01-14T10:00:00Z'),
    },
    {
      slug: 'api-refactor',
      title: 'Refactor API Layer',
      phase: 'validate',
      tasksComplete: 8,
      tasksTotal: 8,
      updatedAt: new Date('2024-01-13T10:00:00Z'),
    },
  ];

  describe('rendering stories', () => {
    it('displays all story slugs', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toContain('auth-feature');
      expect(lastFrame()).toContain('dark-mode');
      expect(lastFrame()).toContain('api-refactor');
    });

    it('displays story list header', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show a header indicating this is a story selection screen
      expect(lastFrame()).toMatch(/select.*story/i);
    });

    it('displays phase information for each story', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show phase indicators for stories
      expect(lastFrame()).toMatch(/implement/i);
      expect(lastFrame()).toMatch(/design/i);
      expect(lastFrame()).toMatch(/validate/i);
    });

    it('displays task progress for each story', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show task counts or progress
      expect(lastFrame()).toMatch(/5\/10/);
      expect(lastFrame()).toMatch(/0\/5/);
      expect(lastFrame()).toMatch(/8\/8/);
    });

    it('displays phase numbers (1-7)', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // implement is phase 6, design is phase 4, validate is phase 7
      expect(lastFrame()).toMatch(/6\/7/);
      expect(lastFrame()).toMatch(/4\/7/);
      expect(lastFrame()).toMatch(/7\/7/);
    });
  });

  describe('selection indicator', () => {
    it('highlights the first story when selectedIndex is 0', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // The selected story should have a > indicator
      expect(lastFrame()).toContain('> auth-feature');
    });

    it('highlights the second story when selectedIndex is 1', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={1}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toContain('> dark-mode');
    });

    it('clamps selectedIndex to valid range', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={100}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should clamp to last item
      expect(lastFrame()).toContain('> api-refactor');
    });

    it('handles negative selectedIndex', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={-5}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should clamp to first item
      expect(lastFrame()).toContain('> auth-feature');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no stories exist', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={[]}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should indicate no stories are available
      expect(lastFrame()).toMatch(/no stor(y|ies)/i);
    });

    it('shows instructions for creating a story when empty', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={[]}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should give guidance via the Create New Story prompt
      expect(lastFrame()).toMatch(/Create New Story.*\[n\]/i);
    });
  });

  describe('scrolling', () => {
    const manyStories: StoryInfo[] = Array.from({ length: 10 }, (_, i) => ({
      slug: `story-${i + 1}`,
      title: `Story ${i + 1}`,
      phase: 'implement' as const,
      tasksComplete: i,
      tasksTotal: 10,
      updatedAt: new Date(Date.now() - i * 1000000),
    }));

    it('shows scroll indicator at top when scrolled down', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={manyStories}
          selectedIndex={8}
          onSelect={() => {}}
          onCancel={() => {}}
          maxHeight={6} // Show only 3 stories (2 lines each)
        />
      );

      expect(lastFrame()).toContain('▲');
    });

    it('shows scroll indicator at bottom when more stories below', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={manyStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
          maxHeight={6} // Show only 3 stories (2 lines each)
        />
      );

      expect(lastFrame()).toContain('▼');
    });
  });

  describe('keyboard hints', () => {
    it('shows navigation instructions', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show keyboard hints
      expect(lastFrame()).toMatch(/Enter/i);
      expect(lastFrame()).toMatch(/Esc/i);
    });
  });

  describe('create new story option', () => {
    it('shows "Create New Story [n]" prompt when not in creation mode', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toMatch(/Create New Story.*\[n\]/i);
    });

    it('shows "Create New Story [n]" prompt even when stories list is empty', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={[]}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toMatch(/Create New Story.*\[n\]/i);
    });

    it('includes n key in keyboard hints', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );

      // Should mention 'n' key for creating new story
      expect(lastFrame()).toMatch(/n.*new/i);
    });
  });

  describe('story creation mode', () => {
    it('renders StoryCreator when isCreating is true', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
          isCreating={true}
          onSubmitCreate={() => {}}
          onCancelCreate={() => {}}
        />
      );

      // Should show StoryCreator with title input prompt
      expect(lastFrame()).toMatch(/Story title:/i);
    });

    it('does not render story list when isCreating is true', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
          isCreating={true}
          onSubmitCreate={() => {}}
          onCancelCreate={() => {}}
        />
      );

      // Should not show story list
      expect(lastFrame()).not.toContain('auth-feature');
      expect(lastFrame()).not.toContain('dark-mode');
    });

    it('passes error to StoryCreator', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
          isCreating={true}
          onSubmitCreate={() => {}}
          onCancelCreate={() => {}}
          createError="Title cannot be empty"
        />
      );

      expect(lastFrame()).toContain('Title cannot be empty');
    });

    it('does not render StoryCreator when isCreating is false', () => {
      const { lastFrame } = render(
        <StoryPicker
          stories={mockStories}
          selectedIndex={0}
          onSelect={() => {}}
          onCancel={() => {}}
          isCreating={false}
          onSubmitCreate={() => {}}
          onCancelCreate={() => {}}
        />
      );

      // Should show story list, not StoryCreator
      expect(lastFrame()).toContain('auth-feature');
      expect(lastFrame()).not.toMatch(/Story title:/i);
    });
  });
});
