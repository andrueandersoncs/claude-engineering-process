/**
 * Workflow Types
 *
 * Types for the engineering-process workflow state, matching the schema
 * defined in SKILL.md:72-87.
 */

/**
 * The 8 phases of the engineering process workflow.
 */
export type Phase =
  | 'understand'
  | 'research'
  | 'scope'
  | 'design'
  | 'decompose'
  | 'implement'
  | 'validate'
  | 'deploy';

/**
 * Jobs To Be Done (JTBD) context for understanding the user's goal.
 */
export interface JTBD {
  context: string;
  job: string;
  outcome: string;
}

/**
 * Workflow state persisted in workflow-state.json.
 * Matches the schema exactly from SKILL.md:72-87.
 */
export interface WorkflowState {
  /** Human-readable story title */
  story: string;
  /** URL-safe slug derived from story title */
  slug: string;
  /** Origin of the story: 'direct', 'github-issue', 'gitlab-issue' */
  source: string;
  /** Optional Jobs To Be Done context */
  jtbd?: JTBD;
  /** Current active phase */
  currentPhase: Phase;
  /** Array of completed phases */
  completedPhases: Phase[];
  /** ISO timestamp when workflow started */
  startedAt: string;
  /** ISO timestamp when workflow was paused (TUI extension) */
  pausedAt?: string;
  /** Reason for regression if workflow regressed to earlier phase */
  regressionReason?: string;
  /** Phase from which regression occurred */
  regressionFrom?: Phase;
  /** Artifacts invalidated by regression */
  invalidatedArtifacts?: string[];
}

/**
 * Summary information about a story for display in the picker.
 */
export interface StoryInfo {
  /** URL-safe slug */
  slug: string;
  /** Human-readable title */
  title: string;
  /** Current phase */
  phase: Phase;
  /** Number of completed tasks */
  tasksComplete: number;
  /** Total number of tasks */
  tasksTotal: number;
  /** Last modification time */
  updatedAt: Date;
}
