/**
 * Utility Exports
 *
 * Barrel export for all utility functions and constants.
 */

// Formatting utilities
export {
  formatDuration,
  formatTimerDisplay,
  drawProgressBar,
  calculatePercentage,
  truncate,
} from './formatting';

// File utilities
export {
  readFileSafe,
  readJsonSafe,
  isDirectory,
  isFile,
  getModifiedTime,
  listSubdirectories,
  getStoryDir,
  getStoryFilePath,
} from './files';

// Constants
export {
  PHASES,
  PHASE_LABELS,
  DEFAULT_OUTPUT_BUFFER_SIZE,
  MIN_TERMINAL_WIDTH,
  MIN_TERMINAL_HEIGHT,
} from './constants';

// Slugify utilities
export { slugify, ensureUniqueSlug } from './slugify';
