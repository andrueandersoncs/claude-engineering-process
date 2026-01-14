/**
 * StoryCreator Component Tests
 *
 * Tests for the StoryCreator component that handles inline story title input.
 *
 * Note: ink-testing-library's stdin.write() does not properly trigger useInput
 * callbacks in Ink v5. Keyboard interaction tests are handled via E2E tests.
 * These unit tests focus on rendering behavior.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StoryCreator } from '../../src/components/StoryCreator';

describe('StoryCreator', () => {
  describe('rendering', () => {
    it('renders a title input prompt', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show a prompt for entering story title
      expect(lastFrame()).toMatch(/story title/i);
    });

    it('renders without error when no error prop is provided', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Should render without crashing
      expect(lastFrame()).toBeDefined();
    });

    it('renders a cursor indicator', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Should show cursor indicator
      expect(lastFrame()).toContain('█');
    });
  });

  describe('error display', () => {
    it('displays error message when error prop is provided', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
          error="Title cannot be empty"
        />
      );

      expect(lastFrame()).toContain('Title cannot be empty');
    });

    it('does not display error when error prop is null', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
          error={null}
        />
      );

      // Should not show any error styling/text by default
      // The frame should not contain typical error markers
      expect(lastFrame()).not.toMatch(/error/i);
    });

    it('does not display error when error prop is undefined', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).not.toMatch(/error/i);
    });

    it('displays multiple errors if provided', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
          error="Custom validation error"
        />
      );

      expect(lastFrame()).toContain('Custom validation error');
    });
  });

  describe('keyboard hints', () => {
    it('shows Enter hint for submit', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toMatch(/enter/i);
    });

    it('shows Escape hint for cancel', () => {
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toMatch(/esc(ape)?/i);
    });
  });

  describe('props interface', () => {
    it('accepts onSubmit callback', () => {
      // This test verifies the component accepts the prop without error
      const onSubmit = () => {};
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('accepts onCancel callback', () => {
      // This test verifies the component accepts the prop without error
      const onCancel = () => {};
      const { lastFrame } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={onCancel}
        />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('accepts optional error prop', () => {
      // Test with error
      const { lastFrame: frame1 } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
          error="Some error"
        />
      );
      expect(frame1()).toContain('Some error');

      // Test without error
      const { lastFrame: frame2 } = render(
        <StoryCreator
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );
      expect(frame2()).not.toContain('Some error');
    });
  });
});
