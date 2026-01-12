# Phase 7: Validate

## Purpose
Verify that the implementation meets requirements, is secure, performs well, and is ready for deployment.

## Agent
**Delegate to: `reviewer`**

The reviewer agent has read-only access plus ability to run tests, specializing in quality verification.

## Activities

### 1. Code Review
Examine all changes:
- Logic correctness
- Error handling
- Security concerns
- Performance implications
- Maintainability

### 2. Test Verification
Run and assess tests:
```bash
# Run full test suite
npm test  # or equivalent

# Check coverage if available
npm run coverage

# Run linting
npm run lint

# Type checking
npm run typecheck
```

### 3. Acceptance Criteria Check
For each criterion from the user story:
- Verify it's implemented
- Test the specific behavior
- Document how it was verified

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

### 6. Manual Testing
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

### Test Results
- Tests run: [count]
- Tests passed: [count]
- Coverage: [percentage if available]

### Acceptance Criteria
- [x] Criterion 1 - Verified: [how]
- [x] Criterion 2 - Verified: [how]
- [ ] Criterion 3 - NOT MET: [reason]

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

- [ ] Code review completed
- [ ] All tests pass
- [ ] Each acceptance criterion verified
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Manual testing completed
- [ ] Review report documented
- [ ] All critical/major issues addressed

## Common Pitfalls

1. **Rubber Stamping** - Approving without thorough review
2. **Scope Expansion** - Adding new requirements during review
3. **Perfectionism** - Blocking on minor style issues
4. **Missing Edge Cases** - Only testing happy path

## Next Phase
Proceed to [Phase 8: Deploy](8-deploy.md) when validation passes.
