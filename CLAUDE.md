# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code Plugin** called `engineering-process` that implements a structured 8-phase software engineering workflow. It orchestrates Claude through the complete journey from user story to deployed software using specialized agents, quality gates, and progressive context loading.

## CRITICAL: Test-Driven Development

**Tests are the source of truth.** This workflow mandates a test-first approach:

1. **Every user story MUST have at least one end-to-end test written BEFORE any implementation code**
2. **Tests MUST fail first** - verify they test what you think they test
3. **A story is not complete until its tests pass**
4. **Tests define "done"** - they are the verification of completion

See `skills/engineering-process/TDD_TESTING_GUIDE.md` for complete testing guidelines.

## Architecture

### Plugin Structure

The plugin is documentation-driven (Markdown + JSON + Bash scripts) with no compiled code:

- **Commands** (`commands/`): User-facing entry points (`/engineering-process:story`, `/engineering-process:phase`, `/engineering-process:checkpoint`)
- **Agents** (`agents/`): Specialized agents with role-specific tool access (explorer, architect, implementer, reviewer)
- **Skills** (`skills/engineering-process/`): Central orchestrator (`SKILL.md`) with phases, checklists, and templates
- **Hooks** (`hooks/`): Pre/post operation validation via `hooks.json`
- **Scripts** (`scripts/`): Bash validation scripts for phase gates

### The 8-Phase Engineering Process (Test-Driven)

1. **Understand** - Comprehend requirements → extract testable acceptance criteria
2. **Research** - Explorer agent analyzes codebase → discover test patterns
3. **Scope** - Define boundaries → define test scope
4. **Design** - Architect creates design → design test architecture
5. **Decompose** - Break into tasks → each task references required tests
6. **Implement** - **Iterative task delegation** (Red→Green→Refactor per task)
7. **Validate** - Reviewer verifies quality → verify test coverage
8. **Deploy** - Release and monitor → run full test suite before/after

### Phase 6: Iterative Task Delegation

Phase 6 (Implement) uses **per-task delegation** to the implementer agent. The orchestrator:

1. Reads `tasks.md` to find the next incomplete task
2. Delegates to the `implementer` agent with task context
3. Waits for task completion
4. Runs validation (tests/lint)
5. Marks task complete if validation passes
6. Repeats until all tasks done

**Why per-task delegation?**
- Fresh context per task = consistent quality throughout
- Each task gets focused context without accumulated state
- Failures are isolated - one task's issues don't pollute the next

### Agent Tool Access

| Agent | Allowed | Restricted |
|-------|---------|------------|
| explorer | Read, Grep, Glob, WebFetch, WebSearch | Write, Edit, Bash |
| architect | Read, Grep, Glob, Write | Edit, Bash |
| implementer | Read, Grep, Glob, Write, Edit, Bash | - |
| reviewer | Read, Grep, Glob, Bash (read-only) | Write, Edit |

### State Management

Each story gets its own isolated directory at `<project>/docs/stories/<story-slug>/`:

```
<project>/docs/stories/<story-slug>/
├── workflow-state.json    # Progress tracking
├── research-notes.md      # Phase 2 output
├── design.md              # Phase 4 output
└── tasks.md               # Phase 5 output
```

The `<story-slug>` is derived from the story title (e.g., "add-user-authentication") or issue number (e.g., "issue-123").

> **Important**: `<project>` refers to the target project directory (current working directory), not the plugin installation directory. Each story is isolated, allowing multiple stories to be tracked independently.

## Development Commands

```bash
# Install from local directory
claude --plugin-dir /path/to/claude-engineering-process

# Symlink for development
ln -s /path/to/claude-engineering-process ~/.claude/plugins/engineering-process
```

## Dependencies

- Claude Code CLI (base platform)
- Bash (for validation scripts)
- `jq` (JSON parsing in scripts)
- Optional: `gh` CLI (GitHub integration), `glab` CLI (GitLab integration)

## Key Files

- `.claude-plugin/plugin.json` - Plugin manifest
- `skills/engineering-process/SKILL.md` - Central orchestrator
- `agents/` - Specialized agents (explorer, architect, implementer, reviewer, etc.)
- `hooks/hooks.json` - Hook configuration for phase gates (requires project setup)
- `scripts/phase-gate.sh` - Phase transition validation
- `scripts/run-validation.sh` - Run tests/lint validation

## Hooks Setup

The hooks require validation scripts to be installed in your project. See `hooks/SETUP.md` for installation instructions.
