# Phase 2: Research

## Purpose
Explore the codebase and verify assumptions before designing a solution. Build a map of the terrain before deciding on a route.

## Agent
**Delegate to: `explorer`**

The explorer agent has read-only access and specializes in codebase navigation without making changes.

## Activities

### 1. Codebase Exploration
Find relevant existing code:
- Where does related data live?
- What's the current architecture for this area?
- Are there existing APIs or services to leverage?
- What patterns are used for similar features?

### 2. Assumption Verification
For each assumption from Phase 1:
- Find evidence confirming or refuting it
- Document the source (file:line)
- Update understanding if assumptions were wrong

### 3. Technical Research
Investigate external factors:
- Library/framework capabilities
- API specifications
- Performance characteristics
- Rate limits, pagination, caching

### 4. Test Infrastructure Discovery (CRITICAL)
Find and document existing test setup:
- Test framework and configuration (Playwright, Vitest, etc.)
- Test directory structure and naming conventions
- Existing fixtures, helpers, and mocks
- How to run tests locally
- CI/CD test configuration
- Code coverage requirements and thresholds

### 5. Pattern Recognition
Identify conventions to follow:
- Code style and structure
- Error handling patterns
- **Testing patterns and approaches**
- Naming conventions

### 6. Dependency Mapping
Understand what this feature touches:
- Which files will need changes?
- What systems integrate with this area?
- Are there downstream effects to consider?

## Delegation to Explorer Agent

```
Delegate to explorer agent:

Context: Research phase for [feature description]

Requirements from understand phase:
- [Requirement 1]
- [Requirement 2]

Assumptions to verify:
- [Assumption 1]
- [Assumption 2]

Questions to answer:
- Where does [X] data live?
- How does [Y] currently work?
- What patterns are used for [Z]?

Expected output: Research notes with file:line references
```

## Output

Create `research-notes.md` in the story directory (`<project>/docs/stories/<story-slug>/research-notes.md`):

```markdown
# Research Notes: [Feature Name]

## Relevant Code Locations

### [Area 1]
- `path/to/file.ts:45-67` - Description
- `path/to/other.ts:12` - Description

### [Area 2]
- `path/to/file.ts:100` - Description

## Verified Assumptions
- [x] Assumption 1 - Confirmed at `file:line`
- [ ] Assumption 2 - REFUTED: Actually [finding]

## Ontology Check (REQUIRED)
Parse request entities/roles/actions and verify against codebase:

| Entity/Role | Expected | Actual in Codebase | Gap? |
|-------------|----------|-------------------|------|
| [Role from request] | [What we expect] | [What actually exists with file:line] | [Mismatch/OK] |
| [Entity from request] | [Expected capability] | [Actual capability] | [Constraint/OK] |

## Detected Contradictions (REQUIRED)
Encode requirements and codebase constraints as logical statements:

| Requirement A | Requirement B / Constraint | Tension | Status |
|---------------|---------------------------|---------|--------|
| [Requirement 1] | [Conflicting requirement or codebase constraint] | [CONFLICT/CLARIFICATION NEEDED] | [UNRESOLVED/Resolved] |
| None detected | - | - | Requirements are consistent |

## Patterns to Follow
- Error handling: [pattern with example location]
- API responses: [pattern with example location]
- Testing: [pattern with example location]

## Test Infrastructure (REQUIRED)
### Framework & Configuration
- E2E Framework: [Playwright/Cypress/etc.]
- Unit Framework: [Vitest/Jest/etc.]
- Config files: [paths to config files]

### Running Tests
```bash
# E2E tests
[command to run e2e tests]

# Unit tests
[command to run unit tests]

# Coverage
[command for coverage]
```

### Existing Test Patterns
- Test file location: [e.g., `tests/e2e/*.spec.ts`]
- Fixture examples: [paths to example fixtures]
- Mock patterns: [paths to example mocks]
- Helper utilities: [paths to test helpers]

## Dependencies & Constraints
- [Dependency 1]: [Details]
- [Constraint 1]: [Details]

## External Research
- [Library/API]: [Findings]

## Open Questions Remaining
- [ ] Question 1
- [ ] Question 2

## Recommendations for Design
- Consider using [X] based on [finding]
- Follow pattern from [location]
- Be aware of [constraint]
```

## Completion Criteria

- [ ] All areas of codebase that will be modified are identified
- [ ] Assumptions from Phase 1 are verified or refuted
- [ ] Existing patterns are documented with examples
- [ ] Dependencies and constraints are understood
- [ ] Research notes are saved as an artifact
- [ ] No blocking questions remain
- [ ] **CRITICAL: Ontology check completed** - all entities/roles/actions verified against codebase
- [ ] **CRITICAL: Contradiction detection completed** - no UNRESOLVED conflicts remain
- [ ] **CRITICAL: Test framework and configuration documented**
- [ ] **CRITICAL: Test commands identified and verified**
- [ ] **CRITICAL: Existing test patterns documented with examples**

### Blocking Conditions (Cannot Proceed)

**DO NOT advance to Phase 3 if any of these are true:**
- [ ] Critical assumption was refuted and requires user input
- [ ] Impossibility discovered that changes what user asked for
- [ ] Scope explosion (5x+) that user hasn't approved
- [ ] Missing business logic that only user can provide

**If any blocking condition is true**: Present findings to user and wait for decision. See "Phase Regression" section below.

## Phase Regression: When Research Contradicts Understanding

**Critical principle from the Ralph Playbook**: Plans are disposable. When trajectories diverge, regenerating costs one loop—far cheaper than spiraling.

### When to Regress to Phase 1

Return to Phase 1 (Understand) when research reveals:

| Finding | Action |
|---------|--------|
| **Assumption refuted** - core requirement can't work as assumed | REGRESS: User must confirm revised understanding |
| **Impossibility discovered** - requested feature fundamentally conflicts with codebase | REGRESS: User must choose alternative approach |
| **Scope explosion** - implementation is 5x+ larger than implied | REGRESS: User must confirm expanded scope |
| **Missing context** - critical business logic was unstated | REGRESS: User must provide missing requirements |

### How to Handle Regression

When a critical contradiction is found:

1. **Document the contradiction** in research notes with evidence (file:line references)
2. **Do NOT auto-advance** to Phase 3
3. **Present to user** with:
   - What was assumed
   - What was actually found
   - Why this changes the picture
   - Proposed alternatives (if any)
4. **Wait for user decision** before proceeding
5. **Update workflow state** if returning to Phase 1:
   ```json
   {
     "currentPhase": "understand",
     "regressionReason": "Assumption X refuted - see research-notes.md",
     "regressionFrom": "research"
   }
   ```

### Example Regression Scenario

```markdown
## Critical Finding: Regression Required

**Original Assumption**: "Users have a `preferences` table we can extend"

**Actual Finding**: No `preferences` table exists. User settings are stored
in a Redis cache with 24h TTL (see `src/services/settings.ts:45-67`).

**Impact**: Cannot implement persistent preferences without either:
1. Creating new database table (larger scope)
2. Using existing Redis approach (loses data after 24h)

**Recommendation**: Return to Phase 1 to clarify requirements with user.

**Blocking**: YES - cannot proceed to Scope without user decision.
```

### When NOT to Regress

Stay in Phase 2 and continue when:
- Minor assumption corrections that don't change scope
- Pattern differences that can be adapted to
- Technical choices that have clear alternatives

**Rule of thumb**: If you can resolve it without changing what the user asked for, stay in Research. If the user's request itself needs to change, regress.

## Common Pitfalls

1. **Shallow Search** - Only looking at obvious locations
2. **Pattern Ignorance** - Not studying how similar features work
3. **Assumption Persistence** - Keeping assumptions despite contradicting evidence
4. **Over-Research** - Exploring beyond what's needed for the task
5. **Regression Avoidance** - Proceeding despite critical contradictions to "save time"

## Next Phase
Proceed to [Phase 3: Scope](3-scope.md) when criteria are met AND no critical contradictions require user input.
