// @engineering-process/tui - Terminal UI for engineering-process plugin

// src/cli.ts
import meow from "meow";
import { resolve } from "path";
import { existsSync } from "fs";
function parseArgs() {
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
          type: "string",
          shortFlag: "p",
          default: "."
        },
        story: {
          type: "string",
          shortFlag: "s"
        },
        headless: {
          type: "boolean",
          default: false
        }
      }
    }
  );
  const projectDir = resolve(cli.flags.project);
  if (!existsSync(projectDir)) {
    console.error(`Error: Project directory does not exist: ${projectDir}`);
    process.exit(1);
  }
  return {
    projectDir,
    initialStory: cli.flags.story,
    headless: cli.flags.headless
  };
}
async function run() {
  const options = parseArgs();
  const { renderApp } = await import("./index.js");
  await renderApp(options);
}
export {
  parseArgs,
  run
};
//# sourceMappingURL=cli.js.map