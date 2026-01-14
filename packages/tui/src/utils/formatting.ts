/**
 * Formatting Utilities
 *
 * Functions for formatting durations, progress bars, and other display elements.
 */

/**
 * Format a duration in seconds to a human-readable string.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "45s", "2m 30s", "1h 15m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return '0s';
  }

  const wholeSecs = Math.floor(seconds);

  if (wholeSecs < 60) {
    return `${wholeSecs}s`;
  }

  if (wholeSecs < 3600) {
    const mins = Math.floor(wholeSecs / 60);
    const secs = wholeSecs % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  const hours = Math.floor(wholeSecs / 3600);
  const mins = Math.floor((wholeSecs % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a duration for timer display (HH:MM:SS format).
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "00:02:34")
 */
export function formatTimerDisplay(seconds: number): string {
  if (seconds < 0) {
    return '00:00:00';
  }

  const wholeSecs = Math.floor(seconds);
  const hours = Math.floor(wholeSecs / 3600);
  const mins = Math.floor((wholeSecs % 3600) / 60);
  const secs = wholeSecs % 60;

  return [hours, mins, secs].map((n) => n.toString().padStart(2, '0')).join(':');
}

/**
 * Draw a Unicode progress bar.
 *
 * @param current - Current progress value
 * @param total - Total value (100%)
 * @param width - Width of the bar in characters (default: 20)
 * @returns Unicode progress bar string (e.g., "████████░░░░")
 */
export function drawProgressBar(current: number, total: number, width: number = 20): string {
  if (total <= 0) {
    return '░'.repeat(width);
  }

  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Calculate percentage with bounds checking.
 *
 * @param current - Current value
 * @param total - Total value
 * @returns Percentage (0-100)
 */
export function calculatePercentage(current: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round(Math.min(Math.max((current / total) * 100, 0), 100));
}

/**
 * Truncate a string with ellipsis if it exceeds max length.
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated string or original if within limit
 */
export function truncate(str: string, maxLength: number): string {
  if (maxLength < 4) {
    return str.slice(0, maxLength);
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}
