---
description: Install validation hooks and scripts into your project. Run this once per project to enable phase gates, downstream backpressure, and fast verification.
---

# Engineering Process: Setup

Set up the engineering-process validation hooks in the current project.

## What This Does

This command installs the validation scripts that enable:

1. **Phase Gates** (PreToolUse) - Validates preconditions before file changes
2. **Downstream Backpressure** (PostToolUse) - Validates artifacts as you work
3. **Fast Verification** (PostToolUse) - Runs typecheck/lint/quick tests on edits
4. **Completion Checks** (Stop) - Verifies phase completion when Claude finishes

## Options

$ARGUMENTS can be:
- (empty) - Install hooks
- `--check` - Verify hooks are installed
- `--uninstall` - Remove installed hooks

## Installation Steps

Run the setup script from the plugin:

```bash
"$PLUGIN_DIR/scripts/setup-hooks.sh" $ARGUMENTS
```

Where `$PLUGIN_DIR` is the directory where the `engineering-process` plugin is installed.

## After Installation

The following scripts will be installed to `.claude/hooks/`:

| Script | Purpose |
|--------|---------|
| `phase-gate.sh` | Validates phase preconditions before file changes |
| `post-write.sh` | Downstream backpressure - validates artifacts after changes |
| `quick-verification.sh` | Fast verification (typecheck, lint, quick tests) |
| `completion-check.sh` | Checks if current phase is complete |
| `check-phase-transition.sh` | Helper for phase transition validation |
| `validate-criteria.sh` | Helper for criteria validation |

Optional verification scripts:
- `verify-requirements.sh` - Requirements verification (Phase 1)
- `detect-contradictions.sh` - Contradiction detection (Phase 1)
- `run-mutation-tests.sh` - Mutation testing (Phase 7)
- `run-fuzzer.sh` - Fuzz testing (Phase 7)
- `run-validation.sh` - General validation runner

## Requirements

- `bash` shell
- `jq` for JSON parsing

If `jq` is not installed, the script will provide installation instructions.

## Hooks Are Optional

The engineering process workflow works without these hooks - the skill instructions guide behavior. Hooks provide additional programmatic guardrails that ensure validation happens automatically.
