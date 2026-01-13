# Phase 4: Design

## Purpose
Plan the solution before implementing. Make architectural decisions and document them with rationale.

## Agent
**Delegate to: `architect`**

The architect agent specializes in design decisions and documentation.

## Activities

### 1. System Architecture
Determine how the feature fits into the system:
- Does this require new services/modules?
- What's the data flow?
- Are there new integration points?

### 2. API Design
If exposing interfaces:
- Define endpoints (REST, GraphQL, etc.)
- Specify request/response shapes
- Document authentication/authorization
- Plan error responses

### 3. Data Modeling
If data changes are needed:
- Define new schemas/tables
- Plan migrations
- Consider indexes for performance
- Document relationships

### 4. UI/UX Design
If there's a frontend component:
- Reference mockups/wireframes
- Define component structure
- Plan state management
- Consider accessibility

### 5. Decision Documentation
For each significant choice:
- Document alternatives considered
- Explain why the chosen option is best
- Note trade-offs accepted

### 6. Test Architecture Design (CRITICAL)
Plan the testing strategy alongside feature design:
- Where E2E tests will live (file names, directory structure)
- What fixtures and test data are needed
- What needs to be mocked vs. tested end-to-end
- Test isolation strategy (how to avoid test interference)
- Authentication/setup helpers needed

### 7. Design Simulation (CRITICAL)
Before finalizing design, mentally "run" through the implementation:

**Walk through each user story step-by-step:**

```markdown
## Design Simulation: User Login Flow

### Step 1: User navigates to /login
- Route exists? ✓ (router.ts:45)
- Component loads? ✓ (LoginPage.tsx)

### Step 2: User enters credentials
- Form component ready? ✓ (LoginForm.tsx)
- Validation logic clear? ✓ (zod schema)

### Step 3: System validates credentials
- Auth service defined? ✓ (auth.service.ts)
- API endpoint specified? ✓ (POST /api/auth/login)

### Step 4: System creates session
- ⚠️ **STUCK**: Where is session stored?
  - Redis? (not configured in design)
  - JWT? (not specified)
  - Cookie? (security implications?)

**ACTION REQUIRED**: Design must specify session storage before proceeding.

### Step 5: User redirected to dashboard
- Redirect mechanism? ✓ (Next.js router)
- Dashboard loads? ✓ (assumes auth context available)
```

**Check for simulation failures:**
- If the simulation gets stuck, you've found an underspecified area
- Document gaps in design.md under "## Design Gaps Identified"
- Resolve all gaps before proceeding to decompose phase

### 8. Risk Assessment
Review technical risks:
- Security implications
- Performance concerns
- Scalability considerations
- Maintenance burden

## Delegation to Architect Agent

```
Delegate to architect agent:

Context: Design phase for [feature description]

Research findings: [Link to research notes or summary]

Scope:
- In scope: [Items]
- Out of scope: [Items]

Constraints:
- [Constraint 1]
- [Constraint 2]

Expected output: Design document using template
```

## Output

Create `design.md` in the story directory (`<project>/docs/stories/<story-slug>/design.md`) using [design template](../templates/design-doc.md):

```markdown
# Design: [Feature Name]

## Overview
[What this design addresses and why]

## Requirements
### Functional
- Requirement 1
- Requirement 2

### Non-Functional
- Performance: [constraints]
- Security: [requirements]

## Architecture
[System changes, diagrams]

## API Design
[Endpoints, contracts]

## Data Model
[Schema changes]

## Test Architecture (REQUIRED)

### E2E Tests
| Test Scenario | File Location | Dependencies |
|---------------|---------------|--------------|
| User can X | tests/e2e/feature.spec.ts | Auth fixture |
| Error handling | tests/e2e/feature.spec.ts | None |

### Test Infrastructure Needs
- Fixtures required: [list]
- Mocks required: [list]
- Test data setup: [describe]
- Cleanup strategy: [describe]

### Test File Structure
```
tests/
├── e2e/
│   └── feature-name.spec.ts    # E2E tests (Playwright)
├── unit/
│   └── feature-name.test.ts    # Unit tests (Vitest)
└── fixtures/
    └── feature-fixtures.ts      # Shared test fixtures
```

## Key Decisions

### Decision 1: [Topic]
**Context**: [Why needed]
**Options**:
1. [Option A] - [pros/cons]
2. [Option B] - [pros/cons]
**Selected**: [Option X]
**Rationale**: [Why]

## Implementation Notes
[Guidance for implementers]

## Risks & Mitigations
[Table of risks]
```

## Completion Criteria

- [ ] Architecture is defined
- [ ] API contracts are specified (if applicable)
- [ ] Data model changes are documented (if applicable)
- [ ] Key decisions are documented with rationale
- [ ] Risks are identified with mitigations
- [ ] Design document is saved as artifact
- [ ] Design is reviewable by others
- [ ] **CRITICAL: Design simulation completed** - all user flows walked through
- [ ] **CRITICAL: No simulation stuck points** - all gaps identified and resolved
- [ ] **CRITICAL: Test architecture is defined**
- [ ] **CRITICAL: E2E test locations and scenarios are planned**
- [ ] **CRITICAL: Test fixtures and mocks are identified**

## Design Review Checklist

Before finalizing:
- [ ] Solves the stated requirements
- [ ] Follows existing patterns where appropriate
- [ ] Doesn't over-engineer for hypothetical futures
- [ ] Security implications considered
- [ ] Performance implications considered
- [ ] Migration path is clear (if changing existing systems)
- [ ] **Testable implementation approach**
- [ ] **E2E test scenarios are defined**
- [ ] **Test infrastructure needs are identified**

## Phase Regression: When Design Reveals Deeper Issues

**Plans are disposable.** If design simulation or risk assessment reveals fundamental problems, don't patch forward—regress.

### When to Regress from Design

| Finding | Regress To | Why |
|---------|------------|-----|
| Simulation stuck on **unclear requirement** | **Phase 1 (Understand)** | Need user clarification on what they actually want |
| Technical **impossibility** discovered | **Phase 1 (Understand)** | User must choose alternative approach |
| **Scope mismatch** with research findings | **Phase 3 (Scope)** | Boundaries were wrong |
| Need **more codebase investigation** | **Phase 2 (Research)** | Research incomplete |

### How to Handle Design Regression

1. **Stop designing** — Don't try to design around fundamental issues
2. **Document the blocker** in design.md under "## Design Blockers"
3. **Identify the root cause** — Is it understanding, scope, or research?
4. **Present to user** with evidence and alternatives
5. **Wait for decision** before proceeding

### Example: Design Reveals Requirement Gap

```markdown
## Design Blocker: Regression Required

**Issue**: Design simulation stuck at "user selects payment method"
- Research found existing checkout flow (checkout.ts:45-89)
- BUT: No payment provider is configured in the system
- This was not in scope—assumed payment was already available

**Options**:
1. Add payment integration (10x scope increase) → Regress to Phase 1
2. Skip payment, manual invoicing only → Regress to Phase 3 to adjust scope

**Recommendation**: Clarify with user which option they prefer.
```

## Common Pitfalls

1. **Over-Engineering** - Building for requirements that don't exist
2. **Under-Specification** - Leaving critical details undefined
3. **Pattern Mismatch** - Using patterns that don't fit the codebase
4. **Missing Rationale** - Documenting "what" but not "why"
5. **Regression Avoidance** - Trying to design around fundamental issues instead of looping back

## Next Phase
Proceed to [Phase 5: Decompose](5-decompose.md) when criteria are met AND no design blockers require regression.
