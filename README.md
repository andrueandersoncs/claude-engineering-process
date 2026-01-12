# Engineering Process Plugin for Claude Code

A structured software engineering workflow plugin that guides Claude Code through the complete journey from user story to deployed software.

## Overview

This plugin implements a systematic 8-phase engineering process:

1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explore codebase, verify assumptions
3. **Scope** - Define boundaries, minimal implementation
4. **Design** - Architecture decisions, documentation
5. **Decompose** - Break into implementable tasks
6. **Implement** - Write code and tests
7. **Validate** - Review, test, verify criteria
8. **Deploy** - Release and monitor

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

The plugin tracks progress in `.claude/workflow-state.json`:

```json
{
  "story": "Add user authentication",
  "currentPhase": "design",
  "completedPhases": ["understand", "research", "scope"],
  "artifacts": {
    "research": "docs/research-notes.md",
    "design": "docs/design-auth.md"
  }
}
```

## Components

### Commands

| Command | Description |
|---------|-------------|
| `/engineering-process:story` | Start a new workflow |
| `/engineering-process:phase` | Navigate between phases |
| `/engineering-process:checkpoint` | Validate phase completion |

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

## Context Efficiency

The plugin is designed to minimize context usage:

- **Minimal baseline**: Only ~50 tokens always loaded
- **Progressive disclosure**: Phase details load on-demand
- **Agent isolation**: Subagents run in forked contexts
- **Hook validation**: Scripts don't consume context

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
│   ├── post-write.sh         # Post-write processing
│   ├── completion-check.sh   # Completion validation
│   └── load-issue.sh         # Issue fetching
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
- Validation before deployment

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
