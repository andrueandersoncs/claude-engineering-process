/**
 * StatusBar Component Tests
 *
 * Tests for the StatusBar component that displays keyboard hints and timer.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusBar } from '../../src/components/StatusBar';

describe('StatusBar', () => {
  describe('keyboard hints', () => {
    it('shows all keyboard hints', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={false}
          isPaused={false}
          currentTaskId={null}
          elapsedSeconds={0}
        />
      );

      const output = lastFrame();
      expect(output).toContain('[p]');
      expect(output).toContain('pause');
      expect(output).toContain('[r]');
      expect(output).toContain('resume');
      expect(output).toContain('[s]');
      expect(output).toContain('story');
      expect(output).toContain('[q]');
      expect(output).toContain('quit');
      expect(output).toContain('[?]');
      expect(output).toContain('help');
    });

    it('enables resume when not running', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={false}
          isPaused={false}
          currentTaskId={null}
          elapsedSeconds={0}
        />
      );

      // Resume should be enabled (highlighted) when not running
      const output = lastFrame();
      expect(output).toContain('[r]');
      expect(output).toContain('resume');
    });

    it('enables pause when running and not paused', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={false}
          currentTaskId="1.1"
          elapsedSeconds={30}
        />
      );

      const output = lastFrame();
      expect(output).toContain('[p]');
      expect(output).toContain('pause');
    });

    it('enables resume when paused', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={true}
          currentTaskId="1.1"
          elapsedSeconds={30}
        />
      );

      const output = lastFrame();
      expect(output).toContain('[r]');
      expect(output).toContain('resume');
    });
  });

  describe('paused indicator', () => {
    it('shows PAUSED when workflow is paused', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={true}
          currentTaskId="2.3"
          elapsedSeconds={60}
        />
      );

      expect(lastFrame()).toContain('PAUSED');
    });

    it('does not show PAUSED when not paused', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={false}
          currentTaskId="2.3"
          elapsedSeconds={60}
        />
      );

      expect(lastFrame()).not.toContain('PAUSED');
    });
  });

  describe('task timer', () => {
    it('shows timer when task is running', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={false}
          currentTaskId="2.3"
          elapsedSeconds={154}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Task 2.3');
      expect(output).toContain('00:02:34'); // 154 seconds = 2:34
    });

    it('does not show timer when no task is active', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={false}
          isPaused={false}
          currentTaskId={null}
          elapsedSeconds={0}
        />
      );

      expect(lastFrame()).not.toContain('Task');
    });

    it('does not show timer when not running even with task ID', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={false}
          isPaused={false}
          currentTaskId="1.1"
          elapsedSeconds={30}
        />
      );

      // Timer should not display when isRunning is false
      expect(lastFrame()).not.toContain('Task 1.1');
    });

    it('formats long durations correctly', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={false}
          currentTaskId="5.1"
          elapsedSeconds={3723} // 1 hour, 2 minutes, 3 seconds
        />
      );

      expect(lastFrame()).toContain('01:02:03');
    });

    it('formats zero duration correctly', () => {
      const { lastFrame } = render(
        <StatusBar
          isRunning={true}
          isPaused={false}
          currentTaskId="1.1"
          elapsedSeconds={0}
        />
      );

      expect(lastFrame()).toContain('00:00:00');
    });
  });
});
