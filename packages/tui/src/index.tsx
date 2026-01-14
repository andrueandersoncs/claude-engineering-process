/**
 * Main entry point for the TUI.
 *
 * Exports the renderApp function that initializes and renders the Ink application.
 * Handles cleanup on exit (SIGINT, SIGTERM) including killing any running Claude processes.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, type Instance } from 'ink';
import type { CLIOptions } from './cli.js';
import { App } from './components/App.js';
import { killAllRunners } from './services/claudeRunner.js';

// Re-export AppProps from the App component
export type { AppProps } from './components/App.js';

// Track the Ink instance for cleanup
let inkInstance: Instance | null = null;

/**
 * Validate that the story exists before rendering.
 * Returns an error message if validation fails, null otherwise.
 */
function validateStory(projectDir: string, storySlug: string): string | null {
  const storyDir = join(projectDir, 'docs', 'stories', storySlug);
  const workflowStatePath = join(storyDir, 'workflow-state.json');

  if (!existsSync(storyDir)) {
    return `Story not found: ${storySlug}`;
  }

  if (!existsSync(workflowStatePath)) {
    return `Invalid story (missing workflow-state.json): ${storySlug}`;
  }

  return null;
}

/**
 * Render the TUI application.
 *
 * @param options - CLI options from argument parsing
 */
export async function renderApp(options: CLIOptions): Promise<void> {
  const { projectDir, initialStory, headless } = options;

  // Handle cleanup on exit
  const cleanup = (): void => {
    // Kill any running Claude processes first
    killAllRunners();

    // Then unmount the Ink instance
    if (inkInstance) {
      inkInstance.unmount();
      inkInstance = null;
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // If a specific story is requested, validate it exists before rendering
  if (initialStory) {
    const validationError = validateStory(projectDir, initialStory);
    if (validationError) {
      console.error(`Error: ${validationError}`);
      process.exit(1);
    }
  }

  // Render the app
  inkInstance = render(
    <App
      projectDir={projectDir}
      initialStory={initialStory}
      headless={headless}
    />
  );

  // In headless mode, wait for initial render then exit
  if (headless) {
    // Give Ink time to render
    await new Promise((resolve) => setTimeout(resolve, 100));
    cleanup();
    return;
  }

  // Wait for the app to be unmounted (user quit)
  await inkInstance.waitUntilExit();
}

// Re-export types for consumers
export type { CLIOptions } from './cli.js';
export * from './types/index.js';
