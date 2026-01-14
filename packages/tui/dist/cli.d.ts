/**
 * CLI Module
 *
 * Parses command-line arguments using meow and launches the TUI.
 * Supports --project, --story, and --headless flags.
 */
/**
 * Parsed CLI options passed to the TUI.
 */
interface CLIOptions {
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
declare function parseArgs(): CLIOptions;
/**
 * Main entry point for the CLI.
 * Parses arguments and renders the TUI.
 */
declare function run(): Promise<void>;

export { type CLIOptions, parseArgs, run };
