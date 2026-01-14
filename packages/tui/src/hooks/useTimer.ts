/**
 * useTimer Hook
 *
 * React hook for tracking elapsed time since task start.
 * Used by the StatusBar component to display task duration.
 *
 * Features:
 * - Returns elapsed seconds since taskStartTime
 * - Updates every second when a task is running
 * - Returns 0 when no task is running
 * - Cleans up interval on unmount
 */

import { useState, useEffect } from 'react';

/**
 * Options for the useTimer hook.
 */
export interface UseTimerOptions {
  /** Task start time, or null if no task is running */
  taskStartTime: Date | null;
  /** Whether the timer is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Result from the useTimer hook.
 */
export interface UseTimerResult {
  /** Elapsed time in seconds since task start */
  elapsedSeconds: number;
}

/**
 * Calculates elapsed seconds from a start time to now.
 */
function calculateElapsedSeconds(startTime: Date | null): number {
  if (!startTime) {
    return 0;
  }
  const now = Date.now();
  const start = startTime.getTime();
  const elapsedMs = now - start;
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

/**
 * Hook for tracking elapsed time since task start.
 *
 * Returns the number of seconds elapsed since `taskStartTime`.
 * Updates every second while a task is running.
 * Returns 0 when no task is running (taskStartTime is null).
 *
 * @example
 * ```tsx
 * const { elapsedSeconds } = useTimer({
 *   taskStartTime: store.taskStartTime,
 * });
 *
 * return <Text>Task time: {elapsedSeconds}s</Text>;
 * ```
 */
export function useTimer({
  taskStartTime,
  enabled = true,
}: UseTimerOptions): UseTimerResult {
  // Initialize with current elapsed time
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    calculateElapsedSeconds(taskStartTime)
  );

  useEffect(() => {
    // If disabled or no task running, ensure elapsed is 0
    if (!enabled || !taskStartTime) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time (in case hook re-runs with new start time)
    setElapsedSeconds(calculateElapsedSeconds(taskStartTime));

    // Set up interval to update every second
    const intervalId = setInterval(() => {
      setElapsedSeconds(calculateElapsedSeconds(taskStartTime));
    }, 1000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [taskStartTime, enabled]);

  return {
    elapsedSeconds,
  };
}
