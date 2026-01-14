/**
 * CLI Module
 *
 * Parses command-line arguments using meow and launches the TUI.
 * Supports --project, --story, and --headless flags.
 */

import meow from 'meow';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Parsed CLI options passed to the TUI.
 */
export interface CLIOptions {
  /** Target project directory containing docs/stories/ */
  projectDir: string;
  /** Optional story slug to open directly */
  initialStory?: string;
  /** Headless mode for testing (renders once and exits) */
  headless: boolean;
}

/**
 * Parse CLI arguments and return options.
 */
export function parseArgs(): CLIOptions {
  const cli = meow(
    `
    Usage
      $ ep-tui [options]

    Options
      --project, -p  Target project directory (default: current directory)
      --story, -s    Story slug to open directly
      --headless     Run in headless mode (for testing)
      --help         Show this help message
      --version      Show version number

    Examples
      $ ep-tui
      $ ep-tui --project /path/to/project
      $ ep-tui --project . --story my-feature
      $ ep-tui --headless --story test-story
  `,
    {
      importMeta: import.meta,
      flags: {
        project: {
          type: 'string',
          shortFlag: 'p',
          default: '.',
        },
        story: {
          type: 'string',
          shortFlag: 's',
        },
        headless: {
          type: 'boolean',
          default: false,
        },
      },
    }
  );

  // Resolve project directory to absolute path
  const projectDir = resolve(cli.flags.project);

  // Validate project directory exists
  if (!existsSync(projectDir)) {
    console.error(`Error: Project directory does not exist: ${projectDir}`);
    process.exit(1);
  }

  return {
    projectDir,
    initialStory: cli.flags.story,
    headless: cli.flags.headless,
  };
}

/**
 * Main entry point for the CLI.
 * Parses arguments and renders the TUI.
 */
export async function run(): Promise<void> {
  const options = parseArgs();

  // Dynamic import to allow tree-shaking and avoid loading React when just showing help
  const { renderApp } = await import('./index.js');

  await renderApp(options);
}
