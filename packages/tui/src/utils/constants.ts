/**
 * Constants
 *
 * Shared constants for the TUI application.
 */

import type { Phase } from '../types';

/**
 * The 8 phases of the engineering process in order.
 */
export const PHASES: readonly Phase[] = [
  'understand',
  'research',
  'scope',
  'design',
  'decompose',
  'implement',
  'validate',
  'deploy',
] as const;

/**
 * Human-readable labels for each phase.
 */
export const PHASE_LABELS: Record<Phase, string> = {
  understand: 'Understand',
  research: 'Research',
  scope: 'Scope',
  design: 'Design',
  decompose: 'Decompose',
  implement: 'Implement',
  validate: 'Validate',
  deploy: 'Deploy',
};

/**
 * Default output buffer size (lines).
 */
export const DEFAULT_OUTPUT_BUFFER_SIZE = 1000;

/**
 * Minimum terminal dimensions for the TUI.
 */
export const MIN_TERMINAL_WIDTH = 80;
export const MIN_TERMINAL_HEIGHT = 24;
