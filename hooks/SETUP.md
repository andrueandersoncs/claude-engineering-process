# Hooks Setup

The hooks in this plugin require the validation scripts to be installed in your project.

## Installation

Copy the hook scripts to your project's `.claude/hooks/` directory:

```bash
# From your project root
mkdir -p .claude/hooks

# Copy scripts from the plugin
cp path/to/engineering-process/scripts/phase-gate.sh .claude/hooks/
cp path/to/engineering-process/scripts/post-write.sh .claude/hooks/
cp path/to/engineering-process/scripts/completion-check.sh .claude/hooks/
cp path/to/engineering-process/scripts/check-phase-transition.sh .claude/hooks/
cp path/to/engineering-process/scripts/validate-criteria.sh .claude/hooks/

# Make executable
chmod +x .claude/hooks/*.sh
```

## What the Hooks Do

| Hook | Trigger | Script | Purpose |
|------|---------|--------|---------|
| PreToolUse | Before Write/Edit | `phase-gate.sh` | Validates phase preconditions before file changes |
| PostToolUse | After Write/Edit | `post-write.sh` | Downstream backpressure - validates artifacts after changes |
| Stop | When Claude finishes | `completion-check.sh` | Checks if current phase is complete |

### Downstream Backpressure (per WIGGUM.md)

The `post-write.sh` hook implements the "downstream backpressure" principle from the Ralph Playbook. When workflow artifacts are written (research-notes.md, design.md, tasks.md), it invokes `check-phase-transition.sh` to:

1. Validate phase completion criteria
2. Check preconditions for the next phase
3. Provide immediate feedback on what's needed to advance

This ensures validation happens *as you work*, not just at phase boundaries.

## Hooks Are Optional

The engineering process workflow works without these hooks. They provide additional guardrails:

- **Without hooks**: The skill instructions guide Claude's behavior
- **With hooks**: Scripts programmatically validate phase transitions

## Requirements

The scripts require:
- `bash`
- `jq` (for JSON parsing)
- Project uses the `docs/stories/<slug>/` directory structure
