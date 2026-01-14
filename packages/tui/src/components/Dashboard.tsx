/**
 * Dashboard Component
 *
 * Main layout component for the TUI application.
 *
 * Layout structure (from design.md):
 * - Header at top (story info, phase progress, task progress bar)
 * - Main area split: TaskListPanel left (30%), OutputPanel right (70%)
 * - StatusBar at bottom (keyboard hints, task timer)
 *
 * Features:
 * - Flexbox layout with responsive sizing
 * - Handles terminal resize gracefully
 * - Minimum size fallback (80x24)
 */

import React from 'react';
import { Box, useStdout } from 'ink';
import { Header } from './Header';
import { TaskListPanel } from './TaskListPanel';
import { OutputPanel } from './OutputPanel';
import { StatusBar } from './StatusBar';
import { SetupView } from './SetupView';
import type { WorkflowState, Task } from '../types';

/** Minimum terminal dimensions for the dashboard */
const MIN_WIDTH = 80;
const MIN_HEIGHT = 24;

/** Layout proportions */
const TASK_PANEL_WIDTH_PERCENT = 30;

/** Reserved rows for header and status bar */
const HEADER_ROWS = 3;
const STATUS_BAR_ROWS = 1;

interface DashboardProps {
  /** Current workflow state */
  story: WorkflowState;
  /** Array of tasks from tasks.md */
  tasks: Task[];
  /** Output lines from Claude subprocess */
  output: string[];
  /** Whether the workflow is currently running */
  isRunning: boolean;
  /** Whether the workflow is paused */
  isPaused: boolean;
  /** ID of the currently active task being executed */
  activeTaskId: string | null;
  /** Index of the currently selected task for navigation */
  selectedTaskIndex: number;
  /** Callback when a task is selected */
  onSelectTask: (id: string) => void;
  /** Elapsed seconds for the current task */
  elapsedSeconds: number;
  /** Whether the engineering workflow is being started (for setup view) */
  isStartingWorkflow?: boolean;
}

/**
 * Dashboard is the main layout component for the TUI.
 *
 * It organizes the UI into:
 * - Header (top): Story info and progress indicators
 * - Main panel (middle): Task list (left) and output (right)
 * - Status bar (bottom): Keyboard hints and timer
 */
export function Dashboard({
  story,
  tasks,
  output,
  isRunning,
  isPaused,
  activeTaskId,
  selectedTaskIndex,
  onSelectTask,
  elapsedSeconds,
  isStartingWorkflow = false,
}: DashboardProps): React.ReactElement {
  // Get terminal dimensions
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? MIN_WIDTH;
  const terminalHeight = stdout?.rows ?? MIN_HEIGHT;

  // Ensure minimum dimensions
  const width = Math.max(terminalWidth, MIN_WIDTH);
  const height = Math.max(terminalHeight, MIN_HEIGHT);

  // Calculate main area height (subtract header and status bar)
  const mainAreaHeight = Math.max(1, height - HEADER_ROWS - STATUS_BAR_ROWS);

  // Calculate task list max height (leave room for borders)
  const taskListMaxHeight = Math.max(1, mainAreaHeight - 2);

  // Calculate output panel max lines
  const outputMaxLines = Math.max(1, mainAreaHeight - 2);

  // Calculate completed task count
  const tasksComplete = tasks.filter((t) => t.status === 'complete').length;
  const tasksTotal = tasks.length;

  // Show SetupView when there are no tasks yet (even if workflow is running)
  // This allows users to see progress while the engineering workflow generates tasks
  const showSetupView = tasksTotal === 0;

  // If in setup mode, render the setup view within the dashboard layout
  if (showSetupView) {
    return (
      <Box flexDirection="column" height={height} width={width}>
        {/* Header - top row */}
        <Box flexShrink={0}>
          <Header
            storySlug={story.slug}
            storyTitle={story.story}
            currentPhase={story.currentPhase}
            completedPhases={story.completedPhases}
            tasksComplete={0}
            tasksTotal={0}
          />
        </Box>

        {/* Setup view - main area */}
        <Box flexGrow={1} borderStyle="single" borderColor="gray">
          <SetupView
            story={story}
            isStarting={isStartingWorkflow}
            isRunning={isRunning}
            output={output}
          />
        </Box>

        {/* Status bar - bottom row */}
        <Box flexShrink={0}>
          <StatusBar
            isRunning={isRunning}
            isPaused={isPaused}
            currentTaskId={null}
            elapsedSeconds={elapsedSeconds}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height} width={width}>
      {/* Header - top row */}
      <Box flexShrink={0}>
        <Header
          storySlug={story.slug}
          storyTitle={story.story}
          currentPhase={story.currentPhase}
          completedPhases={story.completedPhases}
          tasksComplete={tasksComplete}
          tasksTotal={tasksTotal}
        />
      </Box>

      {/* Main area - task list and output side by side */}
      <Box flexDirection="row" flexGrow={1} height={mainAreaHeight}>
        {/* Task list panel - left side (30%) */}
        <Box
          width={`${TASK_PANEL_WIDTH_PERCENT}%`}
          borderStyle="single"
          borderColor="gray"
          flexShrink={0}
          paddingX={1}
        >
          <TaskListPanel
            tasks={tasks}
            activeTaskId={activeTaskId}
            selectedIndex={selectedTaskIndex}
            onSelectTask={onSelectTask}
            maxHeight={taskListMaxHeight}
          />
        </Box>

        {/* Output panel - right side (70%) */}
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <OutputPanel
            lines={output}
            maxVisibleLines={outputMaxLines}
            autoScroll={true}
            isFocused={false}
          />
        </Box>
      </Box>

      {/* Status bar - bottom row */}
      <Box flexShrink={0}>
        <StatusBar
          isRunning={isRunning}
          isPaused={isPaused}
          currentTaskId={activeTaskId}
          elapsedSeconds={elapsedSeconds}
        />
      </Box>
    </Box>
  );
}
