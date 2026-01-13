---
name: engineering-process
description: Orchestrate a complete software engineering workflow from user story to deployment. Use when starting work on features, bugs, or tasks that need structured implementation with research, design, implementation, and validation phases.
allowed-tools: Read, Task, Bash, Write, Edit, Grep, Glob
model: sonnet
user-invocable: true
---

# Engineering Process Orchestrator

You are orchestrating a structured software engineering workflow that transforms a user story into working, deployed software.

## Philosophy

**Four Core Principles:**

1. **Start with the Job, not the feature.** Before building anything, understand the underlying Job To Be Done (JTBD). What progress is the user trying to make? What outcome do they need? Features are negotiable; the job is the real contract. The "so that" clause in user stories preserves the why—don't lose it.

2. **Assumptions are the enemy.** At every phase, surface implicit beliefs and verify them against reality. Engineers who skip verification and proceed on pattern-matching from past experience tend to struggle.

3. **Plans are disposable.** When trajectories diverge, regenerating costs one loop—far cheaper than spiraling endlessly. Don't patch forward; regenerate from corrected understanding.

4. **Stories are negotiable.** Understanding should evolve as new information emerges. A good story describes desired outcomes, not prescribed implementation. Requirements can—and should—be refined at any phase when evidence warrants.

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

### Verification Guides
- [Verification Guide](VERIFICATION_GUIDE.md) - Comprehensive verification techniques (requirements + software)
- [Requirements Verification Checklist](checklists/requirement-verification-checklist.md) - Phase 1 verification
- [Software Verification Checklist](checklists/software-verification-checklist.md) - Phase 6-7 verification

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
  "jtbd": {
    "context": "When [situation/trigger]",
    "job": "I want to [progress/action]",
    "outcome": "So I can [desired result]"
  },
  "currentPhase": "understand",
  "completedPhases": [],
  "startedAt": "ISO timestamp"
}
```

> **Note**: All paths are relative to the target project directory (current working directory), never the plugin directory. Each story is isolated, allowing multiple stories to be worked on independently.

## Phase Overview

| # | Phase | Execution | Purpose | Key Output | Testing Focus |
|---|-------|-----------|---------|------------|---------------|
| 1 | Understand | - | Comprehend requirements, extract JTBD | Clarified requirements + Job To Be Done | Extract testable acceptance criteria |
| 2 | Research | `explorer` | Explore codebase | Research notes | Document test patterns & infrastructure |
| 3 | Scope | - | Define boundaries | Scope definition | Define test scope (required vs optional) |
| 4 | Design | `architect` | Plan solution | Design document | Design test architecture |
| 5 | Decompose | `architect` | Break into tasks | Task breakdown | **Each task MUST reference its tests** |
| 6 | Implement | `implementer` (per task) | Write tests, then code | **Passing E2E tests** + code | **Write failing test FIRST** |
| 7 | Validate | `reviewer` | Verify quality | Review approval | Verify test coverage & quality |
| 8 | Deploy | `implementer` | Release | Deployed feature | Run full test suite pre/post deploy |

> **IMPORTANT**: Phase 6 uses **iterative task delegation** to the implementer agent. See [Phase 6: Implementation Workflow](#phase-6-implementation-workflow) section below.

## Delegation Model

This workflow uses intelligent delegation to reduce user friction while preserving control where it matters.

### User-Required Phases (Cannot Auto-Advance)

| Phase | Why User Required |
|-------|-------------------|
| **1: Understand** | User Story refinement is the contract. User must confirm the Job To Be Done (JTBD), verify acceptance criteria, resolve ambiguous scenarios, and answer blocking questions. The job is the real contract—features are negotiable. |
| **8: Deploy (Production)** | Production deployment requires explicit user authorization. |

### Auto-Advanceable Phases (Delegated to Agents or Loop)

| Phase | Execution | Auto-Advance Criteria |
|-------|-----------|----------------------|
| **2: Research** | `explorer` | `research-notes.md` exists with required sections, no UNRESOLVED contradictions |
| **3: Scope** | `scope-analyst` | Scope is strictly additive and pattern-following; escalates reductions/novel changes |
| **4: Design** | `architect` | `design.md` exists, no simulation stuck points, test architecture defined |
| **5: Decompose** | `architect` | `tasks.md` exists with E2E tests first, each task has completion criteria |
| **6: Implement** | `implementer` (per task) | All tasks `[x]` complete, E2E tests pass, linting passes |
| **7: Validate** | `reviewer` + `validator` | All tests pass, zero critical/major issues, acceptance criteria mapped to tests |

### Delegation Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `explorer` | Read-only codebase exploration | Phase 2 (Research) |
| `architect` | Solution design and task breakdown | Phases 4-5 (Design, Decompose) |
| `implementer` | Code and test implementation | Phases 6, 8 (Implement, Deploy) |
| `reviewer` | Code review and quality verification | Phase 7 (Validate) |
| `validator` | Programmatic phase completion checks | Phase transitions (invoke explicitly via Task tool) |
| `scope-analyst` | Classify scope as auto-approvable vs. user-required | Phase 3 (Scope) when scope is ambiguous |
| `decision-maker` | Select from alternatives when clear technical winner exists | Phase 4 (Design) when multiple options exist |
| `adversary` | Generate adversarial test cases for requirements | Optional: QA/testing verification |
| `requirements-verifier` | Verify requirements for contradictions, preconditions, ambiguity | Phase 1 (Understand) for non-trivial features |
| `verification-advisor` | Recommend appropriate software verification techniques | Phase 4 (Design), Phase 7 (Validate) |

### Agent Invocation

Use the Task tool with `subagent_type` set to the agent name from the table above (e.g., `explorer`, `architect`, `implementer`).

```
Task tool:
  subagent_type: "explorer"
  prompt: "Research the authentication system. Focus on: [specific aspects]"
```

**Built-in agents** (always available): `Explore` (fast, Haiku), `Plan` (read-only), `general-purpose` (all tools)

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

### Phase Regression (Feedback Loops)

**Core Philosophy: Plans Are Disposable**

> "When trajectories diverge, regenerating a plan costs one planning loop—far cheaper than letting Ralph spiral endlessly." — The Ralph Playbook

This workflow embraces **eventual consistency through iteration**, not perfection upfront. Any phase can discover that earlier assumptions were wrong. The correct response is to **regenerate**, not patch forward.

**Key Principles:**
- **Assumptions are the enemy** — At every phase, surface implicit beliefs and verify them against reality
- **Stories are negotiable** — Understanding should evolve as new information emerges
- **Stop and reassess** — When discoveries contradict assumptions, halt and loop back rather than hack around obstacles

### Regression Decision Flow

```
Any Phase discovers critical issue
              │
              ▼
    ┌─────────────────────────┐
    │ What level is affected? │
    └─────────────────────────┘
              │
    ┌─────────┼─────────┬───────────┐
    ▼         ▼         ▼           ▼
REQUIREMENT  SCOPE    DESIGN    TASK ONLY
  wrong      wrong    wrong      wrong
    │         │         │           │
    ▼         ▼         ▼           ▼
 Phase 1   Phase 3   Phase 4    Fix inline
```

### Regression Triggers by Phase

| Current Phase | Trigger | Regress To | Why |
|---------------|---------|------------|-----|
| **2: Research** | Core assumption refuted, impossibility found, scope explosion 5x+, missing business context | **1: Understand** | User's request itself needs to change |
| **3: Scope** | Research contradicts scope assumptions, new dependencies discovered | **2: Research** or **1: Understand** | Need more investigation or user clarification |
| **4: Design** | Simulation reveals requirement gap, technical impossibility, design incompatible with codebase | **1: Understand** or **3: Scope** | Requirements unclear or scope wrong |
| **5: Decompose** | Design has gaps, can't break into testable tasks, complexity explosion | **4: Design** or **3: Scope** | Design underspecified or scope too broad |
| **6: Implement** | Implementation reveals design flaw, tests can't be written for requirement, understanding was wrong | **4: Design** or **1: Understand** | Either design or requirements need revision |
| **7: Validate** | Acceptance criteria unclear, tests don't match user intent | **1: Understand** | Revisit what user actually needs |

### How to Handle Regression

When a critical issue is discovered in ANY phase:

1. **Stop immediately** — Do not try to patch forward
2. **Document the finding** with evidence:
   - What was assumed
   - What was actually found (with file:line references)
   - Why this invalidates earlier work
3. **Determine regression target** — Use the table above
4. **Present to user** with:
   - Clear explanation of the contradiction
   - Proposed alternatives (if any)
   - Recommendation for which phase to revisit
5. **Wait for user decision** — Let user confirm the approach
6. **Update workflow state**:
   ```json
   {
     "currentPhase": "<target-phase>",
     "regressionReason": "Description of why regression is needed",
     "regressionFrom": "<current-phase>",
     "invalidatedArtifacts": ["design.md", "tasks.md"]
   }
   ```
7. **Regenerate affected artifacts** — Don't patch, recreate from the corrected understanding

### When NOT to Regress

Stay in the current phase when:
- Minor corrections that don't change scope or requirements
- Pattern differences that can be adapted to
- Technical choices with clear alternatives
- Implementation details that don't affect the user's request

**Rule of thumb**: If you can resolve it without changing what the user asked for, stay in place. If the user's request itself needs to change, regress.

### Example: Implementation Reveals Understanding Was Wrong

```markdown
## Critical Finding: Regression Required

**Current Phase**: 6 (Implement)
**Regression Target**: 1 (Understand)

**Original Assumption**: "User wants to add login with email/password"

**Actual Finding During Implementation**:
The existing auth system at `src/auth/provider.ts:45-67` is
OAuth-only. Email/password would require:
1. New database table for credentials
2. Password hashing infrastructure
3. Session management separate from OAuth
4. Account linking between OAuth and local accounts

**Impact**: This is 10x the implied scope and changes the
architecture fundamentally.

**Recommendation**: Return to Phase 1 to clarify with user:
- Option A: Add OAuth providers only (Google, GitHub) - fits existing system
- Option B: Full email/password system - significant scope expansion

**Blocking**: YES - cannot continue without user decision.
```

See [Phase 2: Research](phases/2-research.md) for detailed Phase 2 → Phase 1 regression guidance.

### User Override

All auto-decisions are documented and overrideable. Users can:
- Review decisions in `design.md` and `tasks.md`
- Override by editing artifacts and re-running phase
- Force user confirmation with `/engineering-process:checkpoint` at any time

## Phase Execution

For each phase:
1. **Load phase details** from [phases/](phases/) when entering a new phase
2. **Delegate to agent** when the phase specifies one
3. **Invoke the validator agent** to check phase completion criteria (see below)
4. **Update workflow state** with completed phase and artifacts
5. **Proceed to next phase** only when validator returns `AUTO_ADVANCE` or `WARN_AND_ADVANCE`

### Validator Invocation (CRITICAL for Backpressure)

**You MUST invoke the validator agent before advancing phases.** This is the downstream backpressure mechanism that catches errors early.

```
Task tool:
  subagent_type: "validator"
  prompt: |
    Validate completion of the current phase.

    Story directory: docs/stories/<slug>/
    Current phase: <current-phase>

    Check all criteria for this phase and return your validation report.
```

**Why this matters**: The validator agent has detailed criteria for each phase (research notes sections, design simulation checks, test architecture verification, etc.). Without explicit invocation, these checks never run and quality gates are bypassed.

**Validator responses**:
- `AUTO_ADVANCE` → Proceed to next phase immediately
- `WARN_AND_ADVANCE` → Log warnings, then proceed
- `BLOCK` → Stop and report failures to user; do not advance

### Special Case: Phase 6 (Implement)

**Phase 6 uses iterative task execution with the implementer agent.** For each task in `tasks.md`:

1. **Read the next incomplete task** from `tasks.md`
2. **Delegate to the implementer agent** with the specific task context
3. **Verify the task completed** (tests pass, task marked done)
4. **Repeat** until all tasks are complete

**Example implementation delegation:**
```
Use the Task tool with:
  subagent_type: "implementer"
  prompt: |
    Complete Task 1.1 from docs/stories/<slug>/tasks.md

    Context files to reference:
    - docs/stories/<slug>/design.md
    - docs/stories/<slug>/research-notes.md

    This task: [paste the specific task description]

    Follow TDD: Write failing test → Verify failure → Implement → Verify pass
```

**After each task**, run validation to verify tests pass before proceeding to the next task.

## Phase Documentation

Load these on-demand (not all at once):
- [Phase 1: Understand](phases/1-understand.md)
- [Phase 2: Research](phases/2-research.md)
- [Phase 3: Scope](phases/3-scope.md)
- [Phase 4: Design](phases/4-design.md)
- [Phase 5: Decompose](phases/5-decompose.md)
- [Phase 6: Implement](phases/6-implement.md) - **Iterative task delegation**
- [Phase 7: Validate](phases/7-validate.md)
- [Phase 8: Deploy](phases/8-deploy.md)

## Phase 6: Implementation Workflow

**See [Phase 6: Implement](phases/6-implement.md) for complete implementation workflow details.**

Phase 6 uses **iterative per-task delegation** to the implementer agent. Key points:

1. **Fresh context per task** — Each task gets focused context without accumulated state
2. **Backpressure validation** — Run `npm test` via Bash after EVERY task (mandatory)
3. **Never trust self-reports** — Always verify programmatically before advancing
4. **TDD sequence** — Write failing test → Verify failure → Implement → Verify pass

**Quick reference:**
```
Task tool:
  subagent_type: "implementer"
  prompt: "Complete Task X.Y from docs/stories/<slug>/tasks.md"
```

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
- [Requirements Verification Checklist](checklists/requirement-verification-checklist.md) - **Phase 1**
- [Software Verification Checklist](checklists/software-verification-checklist.md) - **Phase 7**

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
