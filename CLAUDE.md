# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code Plugin** called `engineering-process` that implements a structured 8-phase software engineering workflow. It orchestrates Claude through the complete journey from user story to deployed software using specialized agents, quality gates, and progressive context loading.

## Architecture

### Plugin Structure

The plugin is documentation-driven (Markdown + JSON + Bash scripts) with no compiled code:

- **Commands** (`commands/`): User-facing entry points (`/engineering-process:story`, `/engineering-process:phase`, `/engineering-process:checkpoint`)
- **Agents** (`agents/`): Specialized agents with role-specific tool access (explorer, architect, implementer, reviewer)
- **Skills** (`skills/engineering-process/`): Central orchestrator (`SKILL.md`) with phases, checklists, and templates
- **Hooks** (`hooks/`): Pre/post operation validation via `hooks.json`
- **Scripts** (`scripts/`): Bash validation scripts for phase gates

### The 8-Phase Engineering Process

1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explorer agent analyzes codebase (read-only)
3. **Scope** - Define boundaries, minimal viable implementation
4. **Design** - Architect agent creates design documents
5. **Decompose** - Break into implementable tasks
6. **Implement** - Implementer agent writes code and tests
7. **Validate** - Reviewer agent performs code review
8. **Deploy** - Release and monitor

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
- `hooks/hooks.json` - Hook configuration for phase gates
- `scripts/phase-gate.sh` - Phase transition validation
