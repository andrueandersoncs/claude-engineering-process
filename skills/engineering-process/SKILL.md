---
name: engineering-process
description: Orchestrate a complete software engineering workflow from user story to deployment. Use when starting work on features, bugs, or tasks that need structured implementation with research, design, implementation, and validation phases.
allowed-tools: Read, Task, Bash, Write
model: sonnet
user-invocable: true
---

# Engineering Process Orchestrator

You are orchestrating a structured software engineering workflow that transforms a user story into working, deployed software.

## Philosophy

**Assumptions are the enemy.** At every phase, surface implicit beliefs and verify them against reality. Engineers who skip verification and proceed on pattern-matching from past experience tend to struggle.

## Workflow State

Track progress in `.claude/workflow-state.json`:
```json
{
  "story": "Description of the work",
  "source": "issue URL or 'direct'",
  "currentPhase": "understand",
  "completedPhases": [],
  "startedAt": "ISO timestamp",
  "artifacts": {
    "research": "docs/research-notes.md",
    "design": "docs/design-feature.md",
    "tasks": "docs/tasks-feature.md"
  }
}
```

## Phase Overview

| # | Phase | Agent | Purpose | Key Output |
|---|-------|-------|---------|------------|
| 1 | Understand | - | Comprehend requirements | Clarified requirements |
| 2 | Research | `explorer` | Explore codebase | Research notes |
| 3 | Scope | - | Define boundaries | Scope definition |
| 4 | Design | `architect` | Plan solution | Design document |
| 5 | Decompose | `architect` | Break into tasks | Task breakdown |
| 6 | Implement | `implementer` | Write code | Working code + tests |
| 7 | Validate | `reviewer` | Verify quality | Review approval |
| 8 | Deploy | `implementer` | Release | Deployed feature |

## Phase Execution

For each phase:
1. **Load phase details** from [phases/](phases/) when entering a new phase
2. **Delegate to agent** when the phase specifies one
3. **Validate completion** using phase criteria before proceeding
4. **Update workflow state** with completed phase and artifacts
5. **Proceed to next phase** only when criteria are met

## Phase Documentation

Load these on-demand (not all at once):
- [Phase 1: Understand](phases/1-understand.md)
- [Phase 2: Research](phases/2-research.md)
- [Phase 3: Scope](phases/3-scope.md)
- [Phase 4: Design](phases/4-design.md)
- [Phase 5: Decompose](phases/5-decompose.md)
- [Phase 6: Implement](phases/6-implement.md)
- [Phase 7: Validate](phases/7-validate.md)
- [Phase 8: Deploy](phases/8-deploy.md)

## Supporting Resources

### Checklists
- [Research Checklist](checklists/research-checklist.md)
- [Design Checklist](checklists/design-checklist.md)
- [Completion Checklist](checklists/completion-checklist.md)

### Templates
Copy to project `docs/` directory when needed:
- [Design Document Template](templates/design-doc.md)
- [Task Breakdown Template](templates/task-breakdown.md)
- [PR Description Template](templates/pr-description.md)

## Agent Delegation

When delegating to an agent, provide:
1. **Context**: Current phase and what's been completed
2. **Input**: Relevant artifacts and information
3. **Expected output**: What the agent should produce
4. **Constraints**: Any limitations or requirements

Example delegation:
```
Delegate to the explorer agent:
- Context: Research phase for user authentication feature
- Input: Requirements from understand phase
- Expected output: Research notes documenting codebase findings
- Constraints: Focus on auth-related code, don't modify anything
```

## Workflow Control

### Starting a Workflow
1. Parse the user story/issue input
2. Create workflow state file
3. Begin with Understand phase

### Pausing/Resuming
- Workflow state persists in `.claude/workflow-state.json`
- Resume by reading state and continuing from `currentPhase`
- Use `/engineering-process:checkpoint` to verify status

### Skipping Phases
- Allowed but will trigger warning
- User must explicitly confirm skipping
- Record skipped phases in state

### Handling Blockers
- Document the blocker in workflow state
- Propose options to resolve
- Wait for user decision before proceeding

## Quality Gates

These are enforced by hooks, but you should also verify:

### Before Design
- Research phase completed with documented findings
- Assumptions explicitly listed and verified

### Before Implementation
- Design document exists and is complete
- Task breakdown created

### Before Deployment
- All tests passing
- Review completed and approved
- Acceptance criteria verified

## Completion

When all phases are complete:
1. Update workflow state with `currentPhase: "complete"`
2. Summarize what was accomplished
3. List any follow-up items identified
4. Archive or clean up workflow state as appropriate
