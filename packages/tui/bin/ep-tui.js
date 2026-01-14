#!/usr/bin/env node

/**
 * CLI entry point for ep-tui (engineering-process Terminal UI).
 *
 * This script loads the compiled CLI module and runs it.
 * The actual argument parsing and app rendering happens in src/cli.ts.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Get the directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load and run the compiled CLI
const { run } = await import(join(__dirname, '..', 'dist', 'cli.js'));

run();
