/**
 * App Component
 *
 * Root component that orchestrates the entire TUI application.
 *
 * Responsibilities:
 * - Initialize stores on mount
 * - Scan docs/stories/ for available stories
 * - Show StoryPicker if no initialStory provided
 * - Show Dashboard when a story is selected
 * - Show HelpModal on ? key
 * - Handle global keyboard input via useKeyboard hook
 * - Connect all hooks (useFileWatcher, useTimer)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { StoryPicker } from './StoryPicker';
import { Dashboard } from './Dashboard';
import { HelpModal } from './HelpModal';
import { useKeyboard } from '../hooks/useKeyboard';
import { useFileWatcher } from '../hooks/useFileWatcher';
import { useTimer } from '../hooks/useTimer';
import { useTUIStore, setProjectDir, getProjectDir } from '../store';
import {
  createClaudeRunner,
  unregisterRunner,
  type ClaudeRunner,
} from '../services/claudeRunner';
import { buildWorkflowStartPrompt } from '../services/promptBuilder';
import type { WorkflowState, Task } from '../types';

/**
 * Props for the App component.
 */
export interface AppProps {
  /** Target project directory containing docs/stories/ */
  projectDir: string;
  /** Optional story slug to open directly */
  initialStory?: string;
  /** Headless mode for testing (renders once and exits) */
  headless?: boolean;
}

/**
 * App is the root component for the TUI application.
 *
 * It manages the overall application state and renders the appropriate
 * view based on the current state (picker, dashboard, or help modal).
 */
export function App({
  projectDir,
  initialStory,
  headless = false,
}: AppProps): React.ReactElement {
  // Local state for story picker selection (not in global store)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Local state for story creation mode
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Local state for workflow starting (setup view)
  const [isStartingWorkflow, setIsStartingWorkflow] = useState(false);

  // ClaudeRunner instance ref
  const claudeRunnerRef = useRef<ClaudeRunner | null>(null);

  // Access global store
  const stories = useTUIStore((state) => state.stories);
  const currentStory = useTUIStore((state) => state.currentStory);
  const tasks = useTUIStore((state) => state.tasks);
  const activeTaskId = useTUIStore((state) => state.activeTaskId);
  const selectedTaskIndex = useTUIStore((state) => state.selectedTaskIndex);
  const isRunning = useTUIStore((state) => state.isRunning);
  const isPaused = useTUIStore((state) => state.isPaused);
  const output = useTUIStore((state) => state.output);
  const view = useTUIStore((state) => state.view);
  const taskStartTime = useTUIStore((state) => state.taskStartTime);

  // Store actions
  const loadStory = useTUIStore((state) => state.loadStory);
  const refreshStories = useTUIStore((state) => state.refreshStories);
  const createStory = useTUIStore((state) => state.createStory);
  const startWorkflow = useTUIStore((state) => state.startWorkflow);
  const pauseWorkflow = useTUIStore((state) => state.pauseWorkflow);
  const resumeWorkflow = useTUIStore((state) => state.resumeWorkflow);
  const startEngineeringWorkflow = useTUIStore((state) => state.startEngineeringWorkflow);
  const stopWorkflow = useTUIStore((state) => state.stopWorkflow);
  const appendOutput = useTUIStore((state) => state.appendOutput);
  const selectTask = useTUIStore((state) => state.selectTask);
  const setView = useTUIStore((state) => state.setView);

  // Track initialization
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  /**
   * Initialize the application on mount.
   */
  useEffect(() => {
    const initialize = async (): Promise<void> => {
      try {
        // Set the project directory for the store
        setProjectDir(projectDir);

        // Refresh the list of available stories
        await refreshStories();

        // If an initial story is provided, load it directly
        if (initialStory) {
          // Verify the story exists before loading
          const updatedStories = useTUIStore.getState().stories;
          const storyExists = updatedStories.some((s) => s.slug === initialStory);

          if (storyExists) {
            await loadStory(initialStory);
          } else {
            setInitError(`Story not found: ${initialStory}`);
            setIsInitialized(true);
            return;
          }
        }

        setIsInitialized(true);
      } catch (error) {
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true);
      }
    };

    void initialize();
  }, [projectDir, initialStory, refreshStories, loadStory]);

  // Refs for callbacks to avoid stale closures and unnecessary effect reruns
  const appendOutputRef = useRef(appendOutput);
  const stopWorkflowRef = useRef(stopWorkflow);

  // Keep refs up to date
  useEffect(() => {
    appendOutputRef.current = appendOutput;
    stopWorkflowRef.current = stopWorkflow;
  }, [appendOutput, stopWorkflow]);

  /**
   * Initialize and clean up ClaudeRunner instance.
   * Empty dependency array - only run once on mount.
   */
  useEffect(() => {
    // Create the runner
    claudeRunnerRef.current = createClaudeRunner();

    // Set up output handler using ref to avoid stale closure
    const handleOutput = (text: string): void => {
      appendOutputRef.current(text);
    };

    // Set up exit handler using ref to avoid stale closure
    const handleExit = (code: number): void => {
      setIsStartingWorkflow(false);
      stopWorkflowRef.current();
      if (code !== 0) {
        appendOutputRef.current(`\n[Process exited with code ${code}]`);
      }
    };

    claudeRunnerRef.current.onOutput(handleOutput);
    claudeRunnerRef.current.onExit(handleExit);

    // Cleanup on unmount only
    return () => {
      if (claudeRunnerRef.current) {
        claudeRunnerRef.current.removeAllListeners();
        claudeRunnerRef.current.kill();
        unregisterRunner(claudeRunnerRef.current);
        claudeRunnerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  /**
   * Handle starting the engineering workflow (for stories with no tasks).
   */
  const handleStartEngineeringWorkflow = useCallback(async () => {
    if (!currentStory) {
      appendOutput('[Error] No current story selected\n');
      return;
    }
    if (!claudeRunnerRef.current) {
      appendOutput('[Error] Claude runner not initialized\n');
      return;
    }

    setIsStartingWorkflow(true);
    await startEngineeringWorkflow();

    // Build the prompt and spawn Claude
    const prompt = buildWorkflowStartPrompt({
      story: currentStory,
      projectDir: getProjectDir(),
    });

    appendOutput('Starting engineering workflow...\n');
    appendOutput(`[Debug] Working directory: ${getProjectDir()}\n`);
    appendOutput(`[Debug] Spawning claude with prompt (${prompt.length} chars)...\n`);

    try {
      claudeRunnerRef.current.spawn(prompt, {
        cwd: getProjectDir(),
      });
      appendOutput('[Debug] Spawn initiated\n');
    } catch (error) {
      appendOutput(`[Error] Failed to spawn claude: ${error instanceof Error ? error.message : String(error)}\n`);
      setIsStartingWorkflow(false);
      stopWorkflow();
    }
  }, [currentStory, startEngineeringWorkflow, appendOutput, stopWorkflow]);

  /**
   * Handle workflow state changes from file watcher.
   */
  const handleWorkflowChange = useCallback((state: WorkflowState) => {
    // Update the current story in the store
    // This is a simplified update - in a full implementation,
    // we'd have a dedicated action for this
    useTUIStore.setState({ currentStory: state });
  }, []);

  /**
   * Handle task changes from file watcher.
   */
  const handleTasksChange = useCallback((newTasks: Task[]) => {
    useTUIStore.setState({ tasks: newTasks });
  }, []);

  // Set up file watching for the current story
  useFileWatcher({
    projectDir: getProjectDir(),
    storySlug: currentStory?.slug ?? null,
    onWorkflowChange: handleWorkflowChange,
    onTasksChange: handleTasksChange,
    enabled: isInitialized && currentStory !== null && !headless,
  });

  // Set up task timer
  const { elapsedSeconds } = useTimer({
    taskStartTime,
    enabled: isRunning && !headless,
  });

  /**
   * Callbacks for keyboard handling.
   */
  const handleOpenStoryPicker = useCallback(() => {
    setView('picker');
    setSelectedStoryIndex(0);
  }, [setView]);

  const handleCloseStoryPicker = useCallback(() => {
    // Only close if we have a current story to go back to
    if (currentStory) {
      setView('dashboard');
    }
  }, [currentStory, setView]);

  const handleConfirmStorySelection = useCallback(async () => {
    if (stories.length > 0 && selectedStoryIndex < stories.length) {
      const story = stories[selectedStoryIndex];
      if (story) {
        await loadStory(story.slug);
      }
    }
  }, [stories, selectedStoryIndex, loadStory]);

  const handleSelectTask = useCallback(
    (index: number) => {
      selectTask(index);
    },
    [selectTask]
  );

  /**
   * Handle request to create a new story (triggered by 'n' key).
   */
  const handleCreateStory = useCallback(() => {
    setIsCreatingStory(true);
    setCreateError(null);
  }, []);

  /**
   * Handle submission of new story title.
   * Validates the title and creates the story via the store.
   */
  const handleSubmitCreate = useCallback(
    async (title: string) => {
      // Validate: title must not be empty
      const trimmedTitle = title.trim();
      if (trimmedTitle === '') {
        setCreateError('Story title cannot be empty');
        return;
      }

      try {
        // Create the story via the store action
        await createStory(trimmedTitle);
        // Success: store.createStory loads the story and transitions to dashboard
        setIsCreatingStory(false);
        setCreateError(null);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : 'Failed to create story');
      }
    },
    [createStory]
  );

  /**
   * Handle cancellation of story creation (Escape key).
   */
  const handleCancelCreate = useCallback(() => {
    setIsCreatingStory(false);
    setCreateError(null);
  }, []);

  /**
   * Handle start action - either start workflow (if tasks exist) or
   * start the engineering workflow (if no tasks yet).
   */
  const handleStart = useCallback(async () => {
    if (tasks.length === 0) {
      // No tasks yet - start the engineering workflow
      await handleStartEngineeringWorkflow();
    } else {
      // Tasks exist - start the regular workflow
      await startWorkflow();
    }
  }, [tasks.length, handleStartEngineeringWorkflow, startWorkflow]);

  // Set up keyboard handling
  useKeyboard({
    view,
    isRunning,
    isPaused,
    taskCount: tasks.length,
    selectedTaskIndex,
    storyCount: stories.length,
    selectedStoryIndex,
    onPause: pauseWorkflow,
    onResume: resumeWorkflow,
    onStart: handleStart,
    onOpenStoryPicker: handleOpenStoryPicker,
    onCloseStoryPicker: handleCloseStoryPicker,
    onSelectStory: setSelectedStoryIndex,
    onConfirmStorySelection: handleConfirmStorySelection,
    onCreateStory: isCreatingStory ? undefined : handleCreateStory,
    onSetView: setView,
    onSelectTask: handleSelectTask,
    enabled: isInitialized && !headless && !isCreatingStory,
  });

  // Handle loading state
  if (!isInitialized) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  // Handle error state
  if (initError) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {initError}</Text>
      </Box>
    );
  }

  // Render help modal overlay
  if (view === 'help' && currentStory) {
    return (
      <Box flexDirection="column">
        <HelpModal onClose={() => setView('dashboard')} />
      </Box>
    );
  }

  // Render story picker
  if (view === 'picker' || !currentStory) {
    return (
      <StoryPicker
        stories={stories}
        selectedIndex={selectedStoryIndex}
        onSelect={(slug) => void loadStory(slug)}
        onCancel={handleCloseStoryPicker}
        isCreating={isCreatingStory}
        onSubmitCreate={handleSubmitCreate}
        onCancelCreate={handleCancelCreate}
        createError={createError}
      />
    );
  }

  // Render dashboard
  return (
    <Dashboard
      story={currentStory}
      tasks={tasks}
      output={output}
      isRunning={isRunning}
      isPaused={isPaused}
      activeTaskId={activeTaskId}
      selectedTaskIndex={selectedTaskIndex}
      onSelectTask={(id) => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index >= 0) {
          selectTask(index);
        }
      }}
      elapsedSeconds={elapsedSeconds}
      isStartingWorkflow={isStartingWorkflow}
    />
  );
}
