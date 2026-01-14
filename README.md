# Engineering Process Plugin for Claude Code

A structured software engineering workflow plugin that guides Claude Code through the complete journey from user story to validated implementation.

## Overview

This plugin implements a systematic 7-phase engineering process:

1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explore codebase, verify assumptions
3. **Scope** - Define boundaries, minimal implementation
4. **Design** - Architecture decisions, documentation
5. **Decompose** - Break into implementable tasks
6. **Implement** - Write code and tests
7. **Validate** - Review, test, verify criteria (workflow completes here; deployment is handled by users)

Each phase has:
- Specialized agents with appropriate tool access
- Validation gates enforced by hooks
- Templates and checklists for consistency
- Progressive context loading to minimize token usage

## Installation

### From GitHub

```bash
/plugin install github:username/claude-engineering-process
```

### From Local Directory

```bash
claude --plugin-dir /path/to/claude-engineering-process
```

### For Development

```bash
# Symlink to your plugins directory
ln -s /path/to/claude-engineering-process ~/.claude/plugins/engineering-process
```

## Setup

After installation, run the setup command to install validation hooks in your project:

```bash
/engineering-process:setup
```

This installs validation scripts to `.claude/hooks/` that provide:
- **Phase gates** - Validates preconditions before file changes
- **Downstream backpressure** - Validates artifacts as you work
- **Fast verification** - Runs typecheck/lint/quick tests on edits
- **Completion checks** - Verifies phase completion when Claude finishes

You can also:
```bash
/engineering-process:setup --check      # Verify hooks are installed
/engineering-process:setup --uninstall  # Remove installed hooks
```

> **Note**: Hooks are optional. The workflow works without them, but hooks provide programmatic guardrails.

## Usage

### Starting a Workflow

```bash
# Start with a plain text description
/engineering-process:story "Add user authentication with OAuth support"

# Start with a GitHub issue
/engineering-process:story https://github.com/org/repo/issues/123

# Start with an issue number (in a GitHub-connected repo)
/engineering-process:story #123
```

### Navigating Phases

```bash
# Check current status
/engineering-process:checkpoint

# Jump to a specific phase
/engineering-process:phase design

# View available phases
/engineering-process:phase
```

### Workflow State

Each story gets its own directory with all artifacts co-located:

```
<project>/docs/stories/add-user-authentication/
├── workflow-state.json    # Progress tracking
├── research-notes.md      # Codebase research findings
├── design.md              # Architecture decisions
└── tasks.md               # Implementation breakdown
```

**workflow-state.json**:
```json
{
  "story": "Add user authentication",
  "slug": "add-user-authentication",
  "currentPhase": "design",
  "completedPhases": ["understand", "research", "scope"],
  "startedAt": "2024-01-15T10:30:00Z"
}
```

> **Note**: `<project>` refers to the project you're working on (current working directory). Each story is isolated, allowing multiple stories to be tracked independently.

## Components

### Commands

| Command | Description |
|---------|-------------|
| `/engineering-process:story` | Start a new workflow |
| `/engineering-process:phase` | Navigate between phases |
| `/engineering-process:checkpoint` | Validate phase completion |
| `/engineering-process:setup` | Install validation hooks to project |

### Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| `explorer` | Codebase research | Read, Grep, Glob, WebFetch (read-only) |
| `architect` | Solution design | Read, Grep, Glob, Write |
| `implementer` | Code writing | Read, Grep, Glob, Write, Edit, Bash |
| `reviewer` | Code review | Read, Grep, Glob, Bash (read-only) |

### Hooks

- **PreToolUse**: Validates phase gates before file modifications
- **PostToolUse**: Optional formatting after writes
- **Stop**: Warns about incomplete workflows

## Implementation Phase

During the **implement** phase (Phase 6), the workflow uses **iterative task delegation** to the implementer agent for maximum quality.

### Why Per-Task Delegation?

The key insight: each task benefits from focused context. By delegating tasks individually:

1. **Fresh context per task** - No accumulated state pollution
2. **Single task focus** - Maximum quality and clarity
3. **Validation gate** - Tests/lint between tasks catch issues early
4. **Persistent state** - `tasks.md` tracks progress across delegations

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                 IMPLEMENTATION FLOW                      │
│                                                          │
│   1. Read tasks.md, find next incomplete task           │
│   2. Delegate to implementer agent with task context    │
│   3. Implementer completes single task (TDD cycle)      │
│   4. Run validation (tests, lint, typecheck)            │
│   5. If pass: verify task marked complete, continue     │
│   6. If fail: address issue before next task            │
└─────────────────────────────────────────────────────────┘
```

### Supporting Scripts

| Script | Purpose |
|--------|---------|
| `phase-gate.sh` | Phase transition validation |
| `run-validation.sh` | Auto-detect and run tests/lint/typecheck |

## Context Efficiency

The plugin is designed to minimize context usage:

- **Minimal baseline**: Only ~50 tokens always loaded
- **Progressive disclosure**: Phase details load on-demand
- **Agent isolation**: Subagents run in forked contexts
- **Hook validation**: Scripts don't consume context
- **Per-task delegation**: Fresh context per task in implementation phase

Typical session uses ~450-1050 tokens for process guidance.

## Customization

### Modify Templates

Edit files in `skills/engineering-process/templates/`:
- `design-doc.md` - Design document template
- `task-breakdown.md` - Task list template
- `pr-description.md` - Pull request template

### Adjust Hooks

Edit `hooks/hooks.json` to:
- Add formatters to PostToolUse
- Strengthen phase gates
- Add custom validation

### Extend Agents

Modify agent files in `agents/` to:
- Change tool access
- Adjust prompts
- Add new specialized agents

## Directory Structure

```
claude-engineering-process/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/
│   ├── story.md              # Start workflow
│   ├── phase.md              # Navigate phases
│   └── checkpoint.md         # Validate completion
├── agents/
│   ├── explorer.md           # Research agent
│   ├── architect.md          # Design agent
│   ├── implementer.md        # Implementation agent
│   └── reviewer.md           # Review agent
├── skills/
│   └── engineering-process/
│       ├── SKILL.md          # Main orchestrator
│       ├── phases/           # Phase documentation
│       ├── checklists/       # Validation checklists
│       └── templates/        # Document templates
├── hooks/
│   └── hooks.json            # Hook configuration
├── scripts/
│   ├── phase-gate.sh         # Phase validation
│   ├── run-validation.sh     # Test/lint/typecheck runner
│   ├── post-write.sh         # Post-write processing (optional)
│   ├── completion-check.sh   # Completion validation
│   └── load-issue.sh         # Issue fetching (GitHub/GitLab)
├── README.md
└── LICENSE
```

## Requirements

- Claude Code CLI
- Bash (for scripts)
- `jq` (for JSON parsing in scripts)
- Optional: `gh` CLI (for GitHub issue fetching)
- Optional: `glab` CLI (for GitLab issue fetching)

## Philosophy

> **Assumptions are the enemy.** At every phase, surface implicit beliefs and verify them against reality. Engineers who skip verification and proceed on pattern-matching from past experience tend to struggle.

This plugin enforces a disciplined approach:
- Research before design
- Design before implementation
- Validation before completion

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Follow the engineering process (use this plugin!)
4. Submit a pull request

## Support

- Issues: [GitHub Issues](https://github.com/username/claude-engineering-process/issues)
- Discussions: [GitHub Discussions](https://github.com/username/claude-engineering-process/discussions)
