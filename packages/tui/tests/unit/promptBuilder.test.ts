/**
 * Unit tests for the PromptBuilder service.
 *
 * These tests verify the promptBuilder can construct Claude prompts with embedded context
 * following the loop.sh pattern (fresh context per task).
 * Following TDD principles, these tests are written BEFORE the implementation exists,
 * so they will FAIL initially.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module under test - this will fail until implementation exists
import { buildPrompt, type PromptContext } from '../../src/services/promptBuilder';

describe('promptBuilder', () => {
  let tempDir: string;
  let storyDir: string;

  beforeEach(async () => {
    // Create a temporary directory structure for each test
    tempDir = await mkdtemp(join(tmpdir(), 'promptBuilder-test-'));
    storyDir = join(tempDir, 'docs', 'stories', 'test-story');
    await mkdir(storyDir, { recursive: true });

    // Create the required tasks.md file
    await writeFile(
      join(storyDir, 'tasks.md'),
      `# Tasks: Test Story

## Phase 1: Foundation

- [ ] **Task 1.1**: Create initial structure
  - **Description**: Set up the basic file structure.
  - **Files**: \`src/index.ts\`
  - **Done when**: File exists

- [x] **Task 1.2**: Add configuration
  - **Description**: Add config files.
  - **Done when**: Config complete
`
    );
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true });
  });

  describe('buildPrompt', () => {
    describe('building prompt with task context', () => {
      it('includes task ID and title in the prompt', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up the basic file structure.',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('1.1');
        expect(prompt).toContain('Create initial structure');
      });

      it('includes task description in the prompt', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up the basic file structure for the project.',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('Set up the basic file structure for the project.');
      });

      it('includes files to modify in the prompt', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '`src/index.ts`, `src/utils.ts`',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('`src/index.ts`, `src/utils.ts`');
      });

      it('includes completion criteria in the prompt', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: 'File exists and exports main function',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('File exists and exports main function');
      });

      it('includes all task fields together', async () => {
        const context: PromptContext = {
          taskId: '2.1',
          taskTitle: 'Implement core module',
          taskDescription: 'Create the main module with core functionality.',
          taskFiles: '`src/core.ts`',
          taskCriteria: 'Core module exports all required functions',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('2.1');
        expect(prompt).toContain('Implement core module');
        expect(prompt).toContain('Create the main module with core functionality.');
        expect(prompt).toContain('`src/core.ts`');
        expect(prompt).toContain('Core module exports all required functions');
      });

      it('structures prompt with clear sections', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up the basic file structure.',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Verify the prompt has the expected structure
        expect(prompt).toContain('## Current Task');
        expect(prompt).toContain('**Description:**');
        expect(prompt).toContain('**Files to modify:**');
        expect(prompt).toContain('**Completion Criteria:**');
      });
    });

    describe('embedding tasks.md content', () => {
      it('embeds the full tasks.md content in the prompt', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should contain content from the tasks.md file
        expect(prompt).toContain('# Tasks: Test Story');
        expect(prompt).toContain('**Task 1.1**: Create initial structure');
        expect(prompt).toContain('**Task 1.2**: Add configuration');
      });

      it('includes tasks.md under a context section', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should have a section header for the task breakdown
        expect(prompt).toMatch(/### Task Breakdown|## Context/);
      });

      it('wraps tasks.md content in markdown code block', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // tasks.md content should be in a code block
        expect(prompt).toMatch(/```markdown[\s\S]*# Tasks: Test Story[\s\S]*```/);
      });
    });

    describe('handling missing design.md gracefully', () => {
      it('generates valid prompt when design.md does not exist', async () => {
        // No design.md created in storyDir
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up files.',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should not throw and should produce valid prompt
        expect(prompt).toBeDefined();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });

      it('does not include design document section when design.md is missing', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should not have a design document section (or it should be empty/omitted)
        // The exact behavior depends on implementation, but it shouldn't have placeholder text
        expect(prompt).not.toContain('### Design Document\n```markdown\n```');
      });

      it('includes design document when design.md exists', async () => {
        // Create design.md
        await writeFile(
          join(storyDir, 'design.md'),
          `# Design: Test Feature

## Overview

This is the design document for the test feature.

## Architecture

The feature uses a modular architecture.
`
        );

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should include design document content
        expect(prompt).toContain('# Design: Test Feature');
        expect(prompt).toContain('This is the design document for the test feature.');
        expect(prompt).toContain('modular architecture');
      });

      it('wraps design.md content in markdown code block when present', async () => {
        await writeFile(
          join(storyDir, 'design.md'),
          '# Design: Test Feature\n\nContent here.'
        );

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toMatch(/### Design Document[\s\S]*```markdown[\s\S]*# Design: Test Feature[\s\S]*```/);
      });
    });

    describe('handling missing research-notes.md gracefully', () => {
      it('generates valid prompt when research-notes.md does not exist', async () => {
        // No research-notes.md created in storyDir
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up files.',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should not throw and should produce valid prompt
        expect(prompt).toBeDefined();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });

      it('does not include research notes section when research-notes.md is missing', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should not have an empty research notes section
        expect(prompt).not.toContain('### Research Notes\n```markdown\n```');
      });

      it('includes research notes when research-notes.md exists', async () => {
        // Create research-notes.md
        await writeFile(
          join(storyDir, 'research-notes.md'),
          `# Research Notes

## Key Findings

- Finding 1: The codebase uses TypeScript
- Finding 2: Tests are written with Vitest

## Relevant Code

\`\`\`typescript
const example = "code";
\`\`\`
`
        );

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should include research notes content
        expect(prompt).toContain('# Research Notes');
        expect(prompt).toContain('Finding 1: The codebase uses TypeScript');
        expect(prompt).toContain('Finding 2: Tests are written with Vitest');
      });

      it('wraps research-notes.md content in markdown code block when present', async () => {
        await writeFile(
          join(storyDir, 'research-notes.md'),
          '# Research Notes\n\nSome research findings.'
        );

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toMatch(/### Research Notes[\s\S]*```markdown[\s\S]*# Research Notes[\s\S]*```/);
      });
    });

    describe('prompt structure and content', () => {
      it('includes instructions for the implementer', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should have instructions section
        expect(prompt).toContain('## Instructions');
      });

      it('emphasizes focusing only on the current task', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should emphasize single-task focus
        expect(prompt).toMatch(/focus|ONLY|exclusively/i);
        expect(prompt).toContain('Create initial structure');
      });

      it('includes TDD guidance', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should mention TDD/test-first
        expect(prompt).toMatch(/test|TDD/i);
      });

      it('includes completion instructions', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should have after-completion guidance
        expect(prompt).toMatch(/## After Completion|when.*complete/i);
      });
    });

    describe('edge cases', () => {
      it('handles empty task description', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toBeDefined();
        expect(prompt).toContain('Create initial structure');
      });

      it('handles empty task files', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up files.',
          taskFiles: '',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toBeDefined();
        expect(prompt).toContain('Create initial structure');
      });

      it('handles empty task criteria', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up files.',
          taskFiles: '`src/index.ts`',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toBeDefined();
        expect(prompt).toContain('Create initial structure');
      });

      it('handles special characters in task content', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create "special" structure (with symbols) & more',
          taskDescription: 'Handle <brackets> and "quotes"',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'Tests pass && build succeeds',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('Create "special" structure (with symbols) & more');
        expect(prompt).toContain('Handle <brackets> and "quotes"');
        expect(prompt).toContain('Tests pass && build succeeds');
      });

      it('handles multiline task description', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: `This is a multiline description.

It has multiple paragraphs.

And even more content here.`,
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('This is a multiline description.');
        expect(prompt).toContain('It has multiple paragraphs.');
        expect(prompt).toContain('And even more content here.');
      });

      it('handles task ID with different formats', async () => {
        const context: PromptContext = {
          taskId: '10.15',
          taskTitle: 'Task with long ID',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        expect(prompt).toContain('10.15');
        expect(prompt).toContain('Task with long ID');
      });
    });

    describe('error handling', () => {
      it('throws error when tasks.md does not exist', async () => {
        // Remove the tasks.md file
        await rm(join(storyDir, 'tasks.md'));

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir,
        };

        // Should throw an error since tasks.md is required
        await expect(buildPrompt(context)).rejects.toThrow();
      });

      it('throws error when storyDir does not exist', async () => {
        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: '',
          taskFiles: '',
          taskCriteria: '',
          storyDir: '/nonexistent/path/to/story',
        };

        await expect(buildPrompt(context)).rejects.toThrow();
      });
    });

    describe('all optional files present', () => {
      it('includes all context documents when both design.md and research-notes.md exist', async () => {
        // Create both optional files
        await writeFile(
          join(storyDir, 'design.md'),
          '# Design Document\n\nArchitecture details.'
        );
        await writeFile(
          join(storyDir, 'research-notes.md'),
          '# Research Notes\n\nFindings from research.'
        );

        const context: PromptContext = {
          taskId: '1.1',
          taskTitle: 'Create initial structure',
          taskDescription: 'Set up the project.',
          taskFiles: '`src/index.ts`',
          taskCriteria: 'File exists',
          storyDir,
        };

        const prompt = await buildPrompt(context);

        // Should include all three documents
        expect(prompt).toContain('# Tasks: Test Story');
        expect(prompt).toContain('# Design Document');
        expect(prompt).toContain('Architecture details.');
        expect(prompt).toContain('# Research Notes');
        expect(prompt).toContain('Findings from research.');
      });
    });
  });
});
