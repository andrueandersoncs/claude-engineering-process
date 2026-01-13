# Phase 3: Scope

## Purpose
Define clear boundaries for the work. Distinguish between what's in scope for this task and what's adjacent work that should be separate.

## Agent
None (main conversation handles this phase, may consult with user)

## Activities

### 1. Define In-Scope Items
Based on requirements and research, list what WILL be done:
- Core functionality to implement
- Files that will be modified
- **E2E tests that MUST be written (required for every story)**
- Unit/integration tests that will be written
- Documentation that will be updated

### 2. Define Out-of-Scope Items
Explicitly list what will NOT be done:
- Related features that aren't part of this task
- Refactoring opportunities discovered during research
- Nice-to-haves that aren't essential
- Future enhancements

### 3. Define Test Scope (CRITICAL)
Specify which tests are required vs. optional:
- **Required E2E tests** (at least one per story, ideally per acceptance criterion)
- Required unit tests (for complex business logic)
- Optional integration tests
- Test coverage expectations

### 4. Identify Minimal Viable Implementation
Find the smallest useful increment:
- What's the core value being delivered?
- Can this be broken into smaller releases?
- What's the 80/20 split (80% value, 20% effort)?

### 5. Document Dependencies
List what must exist or be true:
- Prerequisite features or data
- External services or APIs
- Team decisions or approvals
- Infrastructure requirements

### 6. Identify Risks
Surface potential problems:
- Technical risks
- Timeline risks
- Dependency risks
- Quality risks

### 7. Confirm with User
If scope decisions affect the original request:
- Present the proposed scope
- Explain trade-offs
- Get explicit agreement

## Output

Document in conversation or update workflow state:

```markdown
## Scope: [Feature Name]

### In Scope
- [ ] Item 1: [Description]
- [ ] Item 2: [Description]
- [ ] Item 3: [Description]

### Out of Scope
- Item A: [Reason - e.g., "separate task", "future enhancement"]
- Item B: [Reason]

### Minimal Viable Implementation
[Description of the smallest useful increment]

Can be delivered in phases:
1. Phase 1: [Core functionality]
2. Phase 2: [Enhancement] (future task)

### Dependencies
- [Dependency 1]: [Status - exists/needed/blocked]
- [Dependency 2]: [Status]

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Risk 1 | Low/Med/High | Low/Med/High | [How to address] |

### Test Scope (REQUIRED)
| Test Type | Required | File/Location | Status |
|-----------|----------|---------------|--------|
| E2E: User can X | Yes | tests/e2e/feature.spec.ts | Pending |
| E2E: Error handling | Yes | tests/e2e/feature.spec.ts | Pending |
| Unit: Logic Y | Yes | src/__tests__/logic.test.ts | Pending |
| Integration: API Z | Optional | - | - |

### Definition of Done
This task is complete when:
- [ ] **All required E2E tests pass**
- [ ] All required unit tests pass
- [ ] Criterion 1
- [ ] Criterion 2
```

## Completion Criteria

- [ ] In-scope items are clearly listed
- [ ] Out-of-scope items are explicitly documented
- [ ] Minimal viable implementation is identified
- [ ] Dependencies are known and their status checked
- [ ] Risks are identified with mitigations
- [ ] Definition of done is established
- [ ] User agrees with scope (if it differs from original request)
- [ ] **CRITICAL: Required E2E tests are specified**
- [ ] **CRITICAL: Test coverage expectations are defined**

## Scope Negotiation

When scope exceeds capacity:
1. Present options to user:
   - Option A: Full scope, longer timeline
   - Option B: Reduced scope, faster delivery
   - Option C: Phased approach
2. Recommend based on value/effort
3. Get explicit decision

When scope seems too small:
1. Verify this isn't missing requirements
2. Check if related work should be bundled
3. Proceed if truly appropriate

## Common Pitfalls

1. **Scope Creep** - Adding "while we're at it" items
2. **Gold Plating** - Including nice-to-haves as required
3. **Undefined Boundaries** - Vague scope that expands during implementation
4. **Missing Dependencies** - Not identifying blockers early

## Next Phase
Proceed to [Phase 4: Design](4-design.md) when criteria are met.
