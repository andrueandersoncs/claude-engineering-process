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

## CRITICAL: Test-Driven Development

**Tests are the source of truth for verifying completion.** This workflow mandates:

### The Iron Rules of Testing
1. **Every user story MUST have at least one end-to-end test written BEFORE any implementation code**
2. **Tests MUST fail first** - verify they actually test what you think they test
3. **A story is NOT complete until its tests pass**
4. **No code without a failing test** - the test defines what needs to be built

### Test-First Sequence
```
UNDERSTAND → Extract testable acceptance criteria
RESEARCH   → Discover existing test patterns and infrastructure
SCOPE      → Define which tests are required vs optional
DESIGN     → Design test architecture alongside feature architecture
DECOMPOSE  → Every task MUST reference its required tests
IMPLEMENT  → Write E2E test → Verify it FAILS → Implement → Verify it PASSES
VALIDATE   → Run full test suite, verify coverage
DEPLOY     → Run tests before and after deployment
```

### Testing Guides
- [TDD Testing Guide](TDD_TESTING_GUIDE.md) - Core test-first philosophy and workflow
- [Playwright Guide](PLAYWRIGHT_GUIDE.md) - End-to-end testing with Playwright
- [Vitest Guide](VITEST_GUIDE.md) - Unit and integration testing with Vitest
- [Testing Checklist](checklists/testing-checklist.md) - Phase-by-phase verification

## Workflow State

Each story gets its own directory at `<project>/docs/stories/<story-slug>/` containing all artifacts:

```
<project>/docs/stories/<story-slug>/
├── workflow-state.json    # Workflow progress and metadata
├── research-notes.md      # Phase 2 output
├── design.md              # Phase 4 output
└── tasks.md               # Phase 5 output
```

The `<story-slug>` is derived from the story title (e.g., "add-user-authentication" from "Add user authentication") or issue number (e.g., "issue-123").

**workflow-state.json**:
```json
{
  "story": "Description of the work",
  "slug": "add-user-authentication",
  "source": "issue URL or 'direct'",
  "currentPhase": "understand",
  "completedPhases": [],
  "startedAt": "ISO timestamp"
}
```

> **Note**: All paths are relative to the target project directory (current working directory), never the plugin directory. Each story is isolated, allowing multiple stories to be worked on independently.

## Phase Overview

| # | Phase | Agent | Purpose | Key Output | Testing Focus |
|---|-------|-------|---------|------------|---------------|
| 1 | Understand | - | Comprehend requirements | Clarified requirements | Extract testable acceptance criteria |
| 2 | Research | `explorer` | Explore codebase | Research notes | Document test patterns & infrastructure |
| 3 | Scope | - | Define boundaries | Scope definition | Define test scope (required vs optional) |
| 4 | Design | `architect` | Plan solution | Design document | Design test architecture |
| 5 | Decompose | `architect` | Break into tasks | Task breakdown | **Each task MUST reference its tests** |
| 6 | Implement | `implementer` | Write tests, then code | **Passing E2E tests** + code | **Write failing test FIRST** |
| 7 | Validate | `reviewer` | Verify quality | Review approval | Verify test coverage & quality |
| 8 | Deploy | `implementer` | Release | Deployed feature | Run full test suite pre/post deploy |

## Delegation Model

This workflow uses intelligent delegation to reduce user friction while preserving control where it matters.

### User-Required Phases (Cannot Auto-Advance)

| Phase | Why User Required |
|-------|-------------------|
| **1: Understand** | User Story refinement is the contract. User must confirm acceptance criteria, resolve ambiguous scenarios, and answer blocking questions. |
| **8: Deploy (Production)** | Production deployment requires explicit user authorization. |

### Auto-Advanceable Phases (Delegated to Agents)

| Phase | Agent | Auto-Advance Criteria |
|-------|-------|----------------------|
| **2: Research** | `explorer` | `research-notes.md` exists with required sections, no UNRESOLVED contradictions |
| **3: Scope** | `scope-analyst` | Scope is strictly additive and pattern-following; escalates reductions/novel changes |
| **4: Design** | `architect` | `design.md` exists, no simulation stuck points, test architecture defined |
| **5: Decompose** | `architect` | `tasks.md` exists with E2E tests first, each task has completion criteria |
| **6: Implement** | `implementer` | All tasks complete, E2E tests pass, linting passes |
| **7: Validate** | `reviewer` + `validator` | All tests pass, zero critical/major issues, acceptance criteria mapped to tests |

### Delegation Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `explorer` | Read-only codebase exploration | Phase 2 (Research) |
| `architect` | Solution design and task breakdown | Phases 4-5 (Design, Decompose) |
| `implementer` | Code and test implementation | Phases 6, 8 (Implement, Deploy) |
| `reviewer` | Code review and quality verification | Phase 7 (Validate) |
| `validator` | Programmatic phase completion checks | Phase transitions (automatic via hooks) |
| `scope-analyst` | Classify scope as auto-approvable vs. user-required | Phase 3 (Scope) when scope is ambiguous |
| `decision-maker` | Select from alternatives when clear technical winner exists | Phase 4 (Design) when multiple options exist |
| `adversary` | Generate adversarial test cases for requirements | Optional: QA/testing verification |

### Agent Invocation

To delegate to an agent, use the Task tool with the appropriate `subagent_type`:

```
Task tool call:
  subagent_type: "engineering-process:explorer"
  prompt: "Research the authentication system..."
```

Available subagent types:
- `engineering-process:explorer` - Read-only codebase exploration
- `engineering-process:architect` - Solution design
- `engineering-process:implementer` - Code implementation
- `engineering-process:reviewer` - Code review
- `engineering-process:validator` - Phase validation (usually automatic)
- `engineering-process:scope-analyst` - Scope classification
- `engineering-process:decision-maker` - Technical decision making
- `engineering-process:adversary` - Adversarial requirement testing

### Auto-Advance Flow

```
Phase completes → validator checks criteria
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      ALL PASS      MINOR FAIL      CRITICAL FAIL
         │               │               │
         ▼               ▼               ▼
   Auto-advance    Warn + advance    Block + report
   to next phase   (log warnings)   (user must resolve)
```

### User Override

All auto-decisions are documented and overrideable. Users can:
- Review decisions in `design.md` and `tasks.md`
- Override by editing artifacts and re-running phase
- Force user confirmation with `/engineering-process:checkpoint` at any time

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

### Testing Guides (CRITICAL)
- [TDD Testing Guide](TDD_TESTING_GUIDE.md) - Core test-first philosophy
- [Playwright Guide](PLAYWRIGHT_GUIDE.md) - End-to-end testing reference
- [Vitest Guide](VITEST_GUIDE.md) - Unit and integration testing reference

### Checklists
- [Testing Checklist](checklists/testing-checklist.md) - **Use at every phase**
- [Research Checklist](checklists/research-checklist.md)
- [Design Checklist](checklists/design-checklist.md)
- [Completion Checklist](checklists/completion-checklist.md)

### Templates
Copy to the story directory when needed:
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
- Workflow state persists in `<project>/docs/stories/<story-slug>/workflow-state.json`
- Resume by reading state and continuing from `currentPhase`
- Use `/engineering-process:checkpoint <story-slug>` to verify status
- List all stories with `/engineering-process:phase` (shows available workflows)

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
- **Test infrastructure and patterns documented**

### Before Implementation
- Design document exists and is complete
- Task breakdown created with **test references for each task**
- **Test architecture defined (file locations, fixtures, mocks)**

### During Implementation (CRITICAL)
- **E2E test written BEFORE implementation code**
- **Test FAILS before implementation begins**
- **Test PASSES after implementation completes**
- No feature code without corresponding tests

### Before Deployment
- **All tests passing (E2E, unit, integration)**
- Review completed and approved
- Acceptance criteria verified **via passing tests**
- **Test coverage meets minimum thresholds**

## Completion

When all phases are complete:
1. Update workflow state with `currentPhase: "complete"`
2. Summarize what was accomplished
3. List any follow-up items identified
4. Archive or clean up workflow state as appropriate
