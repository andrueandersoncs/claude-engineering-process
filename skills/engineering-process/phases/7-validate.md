# Phase 7: Validate

## Purpose
Verify that the implementation meets requirements, is secure, performs well, and is ready for deployment.

**CRITICAL: Validation primarily means verifying that all tests pass and provide adequate coverage.**

## ✅ AUTO-ADVANCEABLE PHASE

This phase can auto-advance to Deploy when ALL conditions are met:

| Criterion | Check |
|-----------|-------|
| All E2E tests pass | `npx playwright test` exits 0 |
| All unit tests pass | `npx vitest run` exits 0 |
| Zero critical issues | `reviewer` finds no CRITICAL severity |
| Zero major issues | `reviewer` finds no MAJOR severity |
| Acceptance criteria mapped | Each criterion has a passing test |

**Auto-advance:** If all above pass, proceed to Deploy (staging only - production requires user).

**Block and report:** If any critical/major issues found, or tests fail.

**Minor issues:** Warn but allow advance (logged for future cleanup).

## Agent

**Delegate to: `reviewer`** for code review, then `validator` for programmatic checks.

The reviewer agent has read-only access plus ability to run tests, specializing in quality verification.

### Delegation Syntax

**For Code Review:**
```
Task tool call:
  subagent_type: "reviewer"
  prompt: |
    Review the implementation for [feature name].

    Design document: docs/stories/[slug]/design.md
    Task breakdown: docs/stories/[slug]/tasks.md

    Acceptance criteria:
    1. [Criterion 1]
    2. [Criterion 2]

    Please:
    1. Review all code changes
    2. Run the test suite
    3. Verify each acceptance criterion has a passing test
    4. Check for security issues
    5. Provide structured review report
```

**For Programmatic Validation:**

The `validator` agent verifies phase completion criteria programmatically. Invoke it explicitly via Task tool:
```
Task tool call:
  subagent_type: "validator"
  prompt: |
    Validate completion criteria for the validate phase.
    Story: [slug]

    Check:
    - All tests pass
    - Acceptance criteria mapped to tests
    - No critical/major review issues
```

## Activities

### 1. Code Review
Examine all changes:
- Logic correctness
- Error handling
- Security concerns
- Performance implications
- Maintainability

### 2. Test Verification (CRITICAL)
Run and assess ALL tests:
```bash
# Run E2E tests (Playwright) - MUST ALL PASS
npx playwright test
npx playwright test --reporter=html  # For detailed report

# Run unit tests (Vitest)
npx vitest run

# Check coverage - verify it meets thresholds
npx vitest run --coverage

# Run linting
npm run lint

# Type checking
npm run typecheck
```

**Test Coverage Requirements:**
- All E2E tests from the task breakdown must pass
- Unit test coverage should be reasonable for new code
- No skipped or pending tests without documented reasons

### 3. Acceptance Criteria Check (Via Tests)
For each criterion from the user story:
- **Verify there is at least one E2E test covering it**
- Run the specific test to confirm it passes
- Document which test verifies which criterion

**Acceptance criteria are verified by passing tests, not manual inspection.**

### 4. Security Review
Check for vulnerabilities:
- Input validation
- Authentication/authorization
- Data exposure
- Injection vulnerabilities
- Dependency vulnerabilities

### 5. Performance Check
If relevant:
- No N+1 queries
- Appropriate caching
- Reasonable response times
- No memory leaks

### 6. Software Verification (Beyond Basic Tests)

Use the [Software Verification Checklist](../checklists/software-verification-checklist.md) to apply verification techniques appropriate to the risk level.

#### The Verification Pyramid

Apply verification in layers based on risk:

```
┌─────────────────────────────────────────┐
│          DEEP CHECKS                    │  ← High/Critical risk only
│    Mutation testing (full)              │
│    Security fuzzing                     │
│    Symbolic execution (optional)        │
├─────────────────────────────────────────┤
│          MEDIUM CHECKS                  │  ← Medium+ risk
│    Property-based testing               │
│    Quick mutation testing               │
│    Fuzzing (for parsers/input handlers) │
│    Metamorphic testing (for complex calc)│
├─────────────────────────────────────────┤
│          FAST CHECKS                    │  ← All code (already done)
│    Type checking, linting, unit tests   │
└─────────────────────────────────────────┘
```

#### 6.1 Property-Based Testing

For code with clear input/output relationships:

```bash
# Python (Hypothesis)
pytest tests/ -m "property"

# JavaScript (fast-check)
npm test -- --testPathPattern="property"
```

**Properties to verify:**
- Roundtrip: `decode(encode(x)) === x`
- Idempotence: `f(f(x)) === f(x)`
- Commutativity/Associativity where applicable

#### 6.2 Mutation Testing

For critical business logic:

```bash
# Run mutation tests
./scripts/run-mutation-tests.sh --quick

# For high-risk code, run full mutation testing
./scripts/run-mutation-tests.sh --full --threshold 80
```

**Mutation score targets:**
- Low risk: > 50%
- Medium risk: > 65%
- High risk: > 80%

#### 6.3 Fuzzing

For parsers, deserializers, and input handlers:

```bash
# Quick fuzz run (5 minutes)
./scripts/run-fuzzer.sh --quick

# Thorough fuzz run (1 hour)
./scripts/run-fuzzer.sh --thorough
```

#### 6.4 Metamorphic Testing

For code without clear oracles (ML, complex calculations):

Document metamorphic relations:
```
MR1: search(query, data) ⊆ search(broader_query, data)
MR2: sort(sort(x)) === sort(x)
MR3: encrypt(decrypt(x, k), k) === x
```

#### 6.5 Invoke Verification Advisor

For guidance on which techniques to apply:

```
Task tool call:
  subagent_type: "verification-advisor"
  prompt: |
    Recommend verification techniques for this code:

    Files changed:
    - src/parsers/json-handler.ts
    - src/services/payment.ts

    Risk assessment: HIGH (handles payments)

    What verification techniques should we apply?
```

See the [Verification Guide](../VERIFICATION_GUIDE.md) for technique details.

### 7. Manual Testing
Walk through the feature:
- Happy path works
- Edge cases handled
- Error states appropriate
- UI/UX acceptable (if applicable)

## Delegation to Reviewer Agent

```
Delegate to reviewer agent:

Context: Validation phase for [feature description]

Design document: docs/design-[feature].md
User story: [Original requirements]

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Please:
1. Review all code changes
2. Run the test suite
3. Verify each acceptance criterion
4. Check for security issues
5. Provide structured review report
```

## Review Report Format

The reviewer should produce:

```markdown
## Validation Report: [Feature Name]

### Summary
Status: [APPROVED / CHANGES REQUESTED]

### Code Review
- Files reviewed: [count]
- Issues found: [count by severity]

#### Critical Issues
[Must fix before deployment]

#### Major Issues
[Should fix before deployment]

#### Minor Issues
[Can fix later]

### Test Results (CRITICAL)
#### E2E Tests (Playwright)
- Tests run: [count]
- Tests passed: [count]
- Tests failed: [count] - MUST BE ZERO

#### Unit Tests (Vitest)
- Tests run: [count]
- Tests passed: [count]
- Coverage: [percentage]

### Acceptance Criteria → Test Mapping
| Criterion | Test File | Test Name | Status |
|-----------|-----------|-----------|--------|
| User can X | tests/e2e/feature.spec.ts | "user can X" | PASS |
| Error Y shown | tests/e2e/feature.spec.ts | "shows error Y" | PASS |
| Logic Z works | src/__tests__/logic.test.ts | "handles Z correctly" | PASS |

### Security Assessment
[Pass / Issues found]

### Performance Assessment
[Pass / Concerns noted]

### Recommendation
[Approve for deployment / Address issues first]
```

## Handling Review Feedback

### If Approved
1. Proceed to deploy phase
2. Update workflow state

### If Changes Requested
1. Return to implement phase
2. Address specific issues
3. Re-run validation
4. Document fixes made

### If Blocked
1. Document the blocker
2. Escalate for decision
3. May require design revision

## Completion Criteria

- [ ] **CRITICAL: All E2E tests pass**
- [ ] **CRITICAL: Each acceptance criterion has a passing test**
- [ ] Code review completed
- [ ] All unit tests pass
- [ ] Test coverage meets thresholds
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Review report documented
- [ ] All critical/major issues addressed

### Software Verification Criteria (Risk-Dependent)

**For Low Risk Code:**
- [ ] Fast checks pass (type checking, linting, unit tests)

**For Medium Risk Code (add to above):**
- [ ] Property-based tests pass (if applicable)
- [ ] Quick mutation testing score > 65%

**For High/Critical Risk Code (add to above):**
- [ ] Full mutation testing score > 80%
- [ ] Fuzzing completed (for input handlers)
- [ ] [Software Verification Checklist](../checklists/software-verification-checklist.md) completed

## Common Pitfalls

1. **Rubber Stamping** - Approving without thorough review
2. **Scope Expansion** - Adding new requirements during review
3. **Perfectionism** - Blocking on minor style issues
4. **Missing Edge Cases** - Only testing happy path
5. **Manual-Only Validation** - Relying on manual testing instead of automated tests
6. **Ignoring Test Coverage** - Not verifying that tests actually cover the acceptance criteria

## Next Phase
Proceed to [Phase 8: Deploy](8-deploy.md) when validation passes.
