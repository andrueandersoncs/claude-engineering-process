---
description: Validate current phase completion before proceeding. Run between phases to ensure quality gates are met and all required artifacts exist.
---

# Engineering Process: Checkpoint Validation

## Purpose

Validate that the current phase is complete and ready to proceed to the next phase.

## Validation Steps

### 1. Load Workflow State

Read `docs/stories/<story-slug>/workflow-state.json` to determine:
- Current phase
- Completed phases
- Expected artifacts

> **Note**: The `<story-slug>` is derived from the story title or issue number. Use the most recent story directory if not specified.

### 2. Phase-Specific Validation

#### Understand Phase
- [ ] Requirements are documented or clearly understood
- [ ] Ambiguities have been identified
- [ ] Questions for stakeholders are listed (if any)

#### Research Phase
- [ ] Relevant codebase areas identified with file:line references
- [ ] Assumptions explicitly listed and verified
- [ ] Research notes documented in `docs/research-notes.md` or similar
- [ ] No blocking questions remain

#### Scope Phase
- [ ] In-scope items clearly defined
- [ ] Out-of-scope items explicitly listed
- [ ] Minimal viable implementation identified
- [ ] Dependencies identified

#### Design Phase
- [ ] Design document exists (check `artifacts.design` in workflow state)
- [ ] Architecture decisions documented with rationale
- [ ] API contracts defined (if applicable)
- [ ] Data model changes specified (if applicable)
- [ ] Risks and mitigations identified

#### Decompose Phase
- [ ] Task breakdown document exists
- [ ] Tasks are small enough to complete in a few hours each
- [ ] Tasks have clear completion criteria
- [ ] Dependencies between tasks identified

#### Implement Phase
- [ ] All tasks from breakdown are complete
- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No TODO comments left unaddressed

#### Validate Phase (Final Phase)
- [ ] Code review completed (or self-reviewed with reviewer agent)
- [ ] All tests pass
- [ ] Acceptance criteria verified
- [ ] No security issues identified
- [ ] Documentation updated
- [ ] Workflow completes when validation passes (users handle deployment)

### 3. Report Results

Output a structured report:

```
## Checkpoint: [Phase Name]

### Status: [PASS / FAIL / PARTIAL]

### Completed
- [x] Item 1
- [x] Item 2

### Missing
- [ ] Item 3 - [reason/recommendation]

### Artifacts
- Design doc: docs/design.md
- Task breakdown: docs/tasks.md

### Recommendation
[Proceed to next phase / Complete missing items first]
```

### 4. Update Workflow State

If validation passes:
1. Add current phase to `completedPhases`
2. Update `currentPhase` to next phase
3. Record completion timestamp

## Usage

Run this command:
- After completing phase activities
- Before starting a new phase
- When resuming work after a break
- To get a status overview at any time
