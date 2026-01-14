/**
 * Unit tests for the TaskParser service.
 *
 * These tests verify the taskParser can parse tasks.md files into structured Task objects.
 * Following TDD principles, these tests are written BEFORE the implementation exists,
 * so they will FAIL initially.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import the module under test - this will fail until implementation exists
import { parseTasksFile } from '../../src/services/taskParser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

describe('taskParser', () => {
  describe('parseTasksFile', () => {
    describe('status parsing', () => {
      it('parses incomplete tasks [ ]', () => {
        const content = '- [ ] **Task 1.1**: Create initial structure';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('1.1');
        expect(tasks[0].status).toBe('incomplete');
        expect(tasks[0].title).toBe('Create initial structure');
      });

      it('parses complete tasks [x]', () => {
        const content = '- [x] **Task 2.3**: Add configuration';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('2.3');
        expect(tasks[0].status).toBe('complete');
        expect(tasks[0].title).toBe('Add configuration');
      });

      it('parses in_progress tasks [~]', () => {
        const content = '- [~] **Task 3.1**: Implement core module';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('3.1');
        expect(tasks[0].status).toBe('in_progress');
        expect(tasks[0].title).toBe('Implement core module');
      });

      it('parses uppercase X as complete [X]', () => {
        const content = '- [X] **Task 1.1**: Done task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].status).toBe('complete');
      });
    });

    describe('field extraction', () => {
      it('extracts task ID from **Task X.Y**: pattern', () => {
        const content = `
- [ ] **Task 4.12**: Complex task with multi-digit ID
  - **Description**: Testing multi-digit IDs
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('4.12');
      });

      it('extracts description field', () => {
        const content = `
- [ ] **Task 1.1**: Create structure
  - **Description**: Set up the basic file structure for the project.
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].description).toBe('Set up the basic file structure for the project.');
      });

      it('extracts files field', () => {
        const content = `
- [ ] **Task 1.2**: Add configuration
  - **Files**: \`tsconfig.json\`, \`package.json\`
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].files).toBe('`tsconfig.json`, `package.json`');
      });

      it('extracts done when / criteria field', () => {
        const content = `
- [ ] **Task 1.1**: Create structure
  - **Done when**: File exists and exports main function
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].criteria).toBe('File exists and exports main function');
      });

      it('extracts dependencies field', () => {
        const content = `
- [ ] **Task 2.1**: Implement module
  - **Dependencies**: Tasks 1.1, 1.2
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].dependencies).toBe('Tasks 1.1, 1.2');
      });

      it('extracts all fields together', () => {
        const content = `
- [~] **Task 2.1**: Implement core module
  - **Description**: Create the main module with core functionality.
  - **Files**: \`src/core.ts\`
  - **Done when**: Core module exports all required functions
  - **Dependencies**: Tasks 1.1, 1.2
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('2.1');
        expect(tasks[0].title).toBe('Implement core module');
        expect(tasks[0].status).toBe('in_progress');
        expect(tasks[0].description).toBe('Create the main module with core functionality.');
        expect(tasks[0].files).toBe('`src/core.ts`');
        expect(tasks[0].criteria).toBe('Core module exports all required functions');
        expect(tasks[0].dependencies).toBe('Tasks 1.1, 1.2');
      });
    });

    describe('multiple tasks', () => {
      it('parses multiple tasks in sequence', () => {
        const content = `
- [ ] **Task 1.1**: First task
- [x] **Task 1.2**: Second task
- [~] **Task 1.3**: Third task
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(3);
        expect(tasks[0].id).toBe('1.1');
        expect(tasks[0].status).toBe('incomplete');
        expect(tasks[1].id).toBe('1.2');
        expect(tasks[1].status).toBe('complete');
        expect(tasks[2].id).toBe('1.3');
        expect(tasks[2].status).toBe('in_progress');
      });

      it('parses the full fixture file', () => {
        const content = readFileSync(join(fixturesDir, 'tasks.md'), 'utf-8');
        const tasks = parseTasksFile(content);

        expect(tasks.length).toBeGreaterThanOrEqual(4);

        // Verify specific tasks from fixture
        const task11 = tasks.find(t => t.id === '1.1');
        expect(task11).toBeDefined();
        expect(task11?.status).toBe('incomplete');
        expect(task11?.title).toBe('Create initial structure');

        const task12 = tasks.find(t => t.id === '1.2');
        expect(task12).toBeDefined();
        expect(task12?.status).toBe('complete');

        const task21 = tasks.find(t => t.id === '2.1');
        expect(task21).toBeDefined();
        expect(task21?.status).toBe('in_progress');
      });

      it('maintains task order from file', () => {
        const content = `
- [ ] **Task 3.1**: Task A
- [ ] **Task 1.1**: Task B
- [ ] **Task 2.1**: Task C
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(3);
        expect(tasks[0].id).toBe('3.1');
        expect(tasks[1].id).toBe('1.1');
        expect(tasks[2].id).toBe('2.1');
      });
    });

    describe('malformed input handling', () => {
      it('returns empty array for empty input', () => {
        const tasks = parseTasksFile('');

        expect(tasks).toEqual([]);
      });

      it('returns empty array for whitespace-only input', () => {
        const tasks = parseTasksFile('   \n\t\n   ');

        expect(tasks).toEqual([]);
      });

      it('ignores non-task lines', () => {
        const content = `
# Tasks: My Story

## Phase 1: Foundation

Some description text here.

- [ ] **Task 1.1**: Real task

## Summary

More text that should be ignored.
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('1.1');
      });

      it('handles task without description gracefully', () => {
        const content = '- [ ] **Task 1.1**: Simple task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].description).toBeUndefined();
      });

      it('handles task without files gracefully', () => {
        const content = '- [ ] **Task 1.1**: Simple task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].files).toBeUndefined();
      });

      it('handles task without criteria gracefully', () => {
        const content = '- [ ] **Task 1.1**: Simple task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].criteria).toBeUndefined();
      });

      it('handles task without dependencies gracefully', () => {
        const content = '- [ ] **Task 1.1**: Simple task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].dependencies).toBeUndefined();
      });

      it('handles malformed status marker gracefully', () => {
        const content = '- [?] **Task 1.1**: Unknown status task';
        const tasks = parseTasksFile(content);

        // Should either skip the task or default to incomplete
        if (tasks.length > 0) {
          expect(tasks[0].status).toBe('incomplete');
        }
      });

      it('handles task with missing ID gracefully', () => {
        const content = '- [ ] **Task**: No ID task';
        const tasks = parseTasksFile(content);

        // Should skip tasks without proper ID format
        expect(tasks).toHaveLength(0);
      });

      it('handles mixed valid and invalid tasks', () => {
        const content = `
- [ ] Invalid line without proper format
- [ ] **Task 1.1**: Valid task
- Some random text
- [x] **Task 1.2**: Another valid task
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(2);
        expect(tasks[0].id).toBe('1.1');
        expect(tasks[1].id).toBe('1.2');
      });

      it('handles fields separated by horizontal rules', () => {
        const content = `
- [ ] **Task 1.1**: First task
  - **Description**: First description

---

- [ ] **Task 1.2**: Second task
  - **Description**: Second description
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(2);
        expect(tasks[0].description).toBe('First description');
        expect(tasks[1].description).toBe('Second description');
      });
    });

    describe('edge cases', () => {
      it('handles task titles with special characters', () => {
        const content = '- [ ] **Task 1.1**: Create "special" task (with parens) & symbols';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].title).toBe('Create "special" task (with parens) & symbols');
      });

      it('handles task IDs with phase format like 0.1', () => {
        const content = '- [ ] **Task 0.1**: Phase zero task';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('0.1');
      });

      it('handles long task IDs like 10.15', () => {
        const content = '- [ ] **Task 10.15**: Task with long numbers';
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe('10.15');
      });

      it('handles alternate Status field name', () => {
        const content = `
- [ ] **Task 1.1**: Task with status field
  - **Status**: incomplete
`;
        const tasks = parseTasksFile(content);

        // Status should come from the marker, not the field
        expect(tasks).toHaveLength(1);
        expect(tasks[0].status).toBe('incomplete');
      });

      it('trims whitespace from extracted fields', () => {
        const content = `
- [ ] **Task 1.1**:   Padded title
  - **Description**:   Padded description
`;
        const tasks = parseTasksFile(content);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].title).toBe('Padded title');
        expect(tasks[0].description).toBe('Padded description');
      });
    });
  });
});
