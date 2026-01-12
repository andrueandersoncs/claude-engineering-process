---
description: Jump to or review a specific phase of the engineering process. Use to navigate between phases, review phase requirements, or restart a phase.
---

# Engineering Process: Phase Navigation

## Input
**Phase**: $ARGUMENTS

## Valid Phases

| Phase | Description |
|-------|-------------|
| `understand` | Comprehend requirements, identify gaps and ambiguities |
| `research` | Explore codebase, verify assumptions, gather context |
| `scope` | Define boundaries, identify minimal viable implementation |
| `design` | Architecture decisions, API design, data modeling |
| `decompose` | Break work into implementable tasks |
| `implement` | Write code and tests following the design |
| `validate` | Review changes, run tests, verify acceptance criteria |
| `deploy` | Release to production, monitor for issues |

## Actions

### If phase name provided ($ARGUMENTS is not empty):

1. **Load phase details** from the engineering-process skill's `phases/` directory
2. **Update workflow state** to set `currentPhase` to the requested phase
3. **Check prerequisites** - warn if skipping phases that haven't been completed
4. **Execute the phase** following its documented activities

### If no phase name provided:

1. **Read current workflow state** from `.claude/workflow-state.json`
2. **Display current phase** and what's been completed
3. **Show next recommended phase** based on workflow state

## Phase Transitions

When completing a phase:
1. Add the phase to `completedPhases` array in workflow state
2. Record any artifacts created during the phase
3. Run `/engineering-process:checkpoint` to validate completion
4. Proceed to the next phase

## Example Usage

```
/engineering-process:phase research    # Jump to research phase
/engineering-process:phase             # Show current status
/engineering-process:phase implement   # Skip to implementation (with warning)
```
