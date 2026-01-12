---
description: Start a structured engineering workflow for a user story, issue, or task. Use when beginning work on features, bug fixes, or any development task that benefits from systematic implementation.
---

# Engineering Process: Story Workflow

You are starting a structured engineering workflow for a user story or task.

## Input
**Story/Issue**: $ARGUMENTS

This can be:
- A GitHub/GitLab issue URL
- An issue number (e.g., #123)
- A plain text description of the task

## Initialization Steps

1. **Parse the input** to understand what work is being requested

2. **Generate a story slug** from the input:
   - From title: "Add user authentication" → `add-user-authentication`
   - From issue: "#123" or issue URL → `issue-123`
   - Use lowercase, hyphens for spaces, remove special characters

3. **Create story directory** in the target project:
   ```bash
   mkdir -p <project>/docs/stories/<story-slug>
   ```

4. **Create workflow state** at `<project>/docs/stories/<story-slug>/workflow-state.json`:
   ```json
   {
     "story": "<parsed story description>",
     "slug": "<story-slug>",
     "source": "<issue URL or 'direct'>",
     "currentPhase": "understand",
     "completedPhases": [],
     "startedAt": "<ISO timestamp>"
   }
   ```

   > **Note**: `<project>` is the current working directory. Each story gets its own isolated directory for all artifacts.

5. **Activate the engineering-process skill** to orchestrate the full workflow

## Workflow Overview

The skill will guide you through these phases:
1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explore codebase, verify assumptions
3. **Scope** - Define boundaries, minimal implementation
4. **Design** - Architecture decisions, document approach
5. **Decompose** - Break into implementable tasks
6. **Implement** - Write code and tests
7. **Validate** - Review, test, verify criteria
8. **Deploy** - Release and monitor

Each phase has:
- Specific activities and outputs
- A specialized agent when needed
- Validation gates before proceeding

## Begin

Invoke the `engineering-process` skill now with the parsed story information.
