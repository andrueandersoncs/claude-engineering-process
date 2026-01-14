/**
 * PromptBuilder Service
 *
 * Constructs Claude prompts with embedded context following the loop.sh pattern
 * (fresh context per task). The prompt includes task details and all relevant
 * story documentation.
 */

import { join } from 'path';
import { readFileSafe, isDirectory } from '../utils/files';
import type { WorkflowState } from '../types';

/**
 * Context required to build a prompt for a task.
 */
export interface PromptContext {
  /** Task identifier (e.g., "1.1", "2.3") */
  taskId: string;
  /** Task title */
  taskTitle: string;
  /** Task description (may be empty) */
  taskDescription: string;
  /** Files to modify (may be empty) */
  taskFiles: string;
  /** Completion criteria (may be empty) */
  taskCriteria: string;
  /** Absolute path to the story directory */
  storyDir: string;
}

/**
 * Builds a prompt with embedded context for Claude to execute a single task.
 *
 * @param context - The prompt context containing task details and story directory
 * @returns The constructed prompt string
 * @throws Error if tasks.md does not exist or storyDir is invalid
 */
export async function buildPrompt(context: PromptContext): Promise<string> {
  const { taskId, taskTitle, taskDescription, taskFiles, taskCriteria, storyDir } = context;

  // Validate storyDir exists
  if (!isDirectory(storyDir)) {
    throw new Error(`Story directory does not exist: ${storyDir}`);
  }

  // Read required tasks.md file
  const tasksPath = join(storyDir, 'tasks.md');
  const tasksContent = readFileSafe(tasksPath);
  if (tasksContent === null) {
    throw new Error(`Required file tasks.md not found in: ${storyDir}`);
  }

  // Read optional files
  const designPath = join(storyDir, 'design.md');
  const designContent = readFileSafe(designPath);

  const researchPath = join(storyDir, 'research-notes.md');
  const researchContent = readFileSafe(researchPath);

  // Build the prompt following the design.md specification
  const prompt = `# Autonomous Implementation Task

You are executing a single task from an implementation plan. Focus ONLY on this task.

## Current Task: ${taskId} - ${taskTitle}

**Description:**
${taskDescription}

**Files to modify:**
${taskFiles}

**Completion Criteria:**
${taskCriteria}

## Instructions

1. Implement ONLY what this task requires - no more, no less
2. Write tests FIRST if the task involves new functionality (TDD)
3. Ensure all existing tests still pass
4. When complete, the task criteria above should all be satisfied

## Context

### Task Breakdown (docs/stories/<story-slug>/tasks.md)
\`\`\`markdown
${tasksContent}
\`\`\`
${designContent ? `
### Design Document (docs/stories/<story-slug>/design.md)
\`\`\`markdown
${designContent}
\`\`\`
` : ''}${researchContent ? `
### Research Notes (docs/stories/<story-slug>/research-notes.md)
\`\`\`markdown
${researchContent}
\`\`\`
` : ''}

## After Completion

When you've completed the task:
1. Verify the completion criteria are met
2. Run any relevant tests
3. Summarize what was done

Do NOT move on to other tasks. Focus exclusively on: **${taskTitle}**`;

  return prompt;
}

/**
 * Context required to build a prompt for starting the engineering workflow.
 */
export interface WorkflowStartContext {
  /** The workflow state for the story */
  story: WorkflowState;
  /** Absolute path to the project directory */
  projectDir: string;
}

/**
 * Builds a prompt to start or continue the engineering-process workflow.
 *
 * This prompt tells Claude to work through the engineering phases for
 * the given story, starting from the current phase.
 *
 * @param context - The workflow start context
 * @returns The constructed prompt string
 */
export function buildWorkflowStartPrompt(context: WorkflowStartContext): string {
  const { story, projectDir } = context;

  // Read any existing research notes or design docs
  const storyDir = join(projectDir, 'docs', 'stories', story.slug);
  const researchContent = readFileSafe(join(storyDir, 'research-notes.md'));
  const designContent = readFileSafe(join(storyDir, 'design.md'));

  const prompt = `You are working on an engineering story. Please work through the engineering process phases to generate implementation tasks.

## Story Information

**Title**: ${story.story}
**Slug**: ${story.slug}
**Story Directory**: docs/stories/${story.slug}/
**Current Phase**: ${story.currentPhase}
**Completed Phases**: ${story.completedPhases.length > 0 ? story.completedPhases.join(', ') : 'none'}
**Started**: ${story.startedAt}
${story.source !== 'direct' ? `**Source**: ${story.source}` : ''}
${story.jtbd ? `
## Jobs To Be Done (JTBD)
- **Context**: ${story.jtbd.context}
- **Job**: ${story.jtbd.job}
- **Outcome**: ${story.jtbd.outcome}
` : ''}
${researchContent ? `
## Existing Research Notes
Research notes already exist at docs/stories/${story.slug}/research-notes.md
` : ''}
${designContent ? `
## Existing Design Document
Design document already exists at docs/stories/${story.slug}/design.md
` : ''}

## Instructions

Work through the 7-phase engineering process starting from the "${story.currentPhase}" phase:

1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explore codebase, verify assumptions
3. **Scope** - Define boundaries, minimal implementation
4. **Design** - Architecture decisions, document approach
5. **Decompose** - Break into implementable tasks
6. **Implement** - Write code and tests
7. **Validate** - Review, test, verify criteria

The story directory and workflow-state.json already exist at docs/stories/${story.slug}/ - do not recreate them.

Your goal is to progress through the phases and generate a tasks.md file that defines the implementation work. Update the workflow-state.json as you complete each phase.

Please begin by analyzing the current phase and determining what needs to be done.`;

  return prompt;
}
