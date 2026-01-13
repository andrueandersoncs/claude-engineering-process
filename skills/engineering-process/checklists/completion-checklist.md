# Completion Checklist

Use this checklist before marking a workflow as complete.

## Implementation Complete

### All Tasks Done
- [ ] Every task in breakdown is marked complete
- [ ] No incomplete work left behind
- [ ] All "TODO" comments addressed
- [ ] No placeholder code remaining

### Code Quality
- [ ] **All E2E tests pass**
- [ ] **All unit tests pass**
- [ ] No linting errors
- [ ] No type errors
- [ ] Code follows project conventions
- [ ] No security vulnerabilities

### Commits
- [ ] All changes committed
- [ ] Commit messages are clear
- [ ] No untracked files that should be tracked
- [ ] Commit history is clean

## Validation Complete

### Code Review
- [ ] All code reviewed
- [ ] Critical issues addressed
- [ ] Major issues addressed
- [ ] Review approved

### Testing (CRITICAL)
- [ ] **E2E tests were written BEFORE implementation**
- [ ] **E2E tests verify each acceptance criterion**
- [ ] **All E2E tests pass**
- [ ] Unit tests written for complex logic
- [ ] Unit tests passing
- [ ] Manual smoke testing completed
- [ ] Edge cases covered by tests

### Acceptance Criteria (Verified by Tests)
- [ ] **Each criterion has a passing E2E test**
- [ ] Verification documented (test file:test name)
- [ ] Stakeholder sign-off (if required)

## Documentation Updated

### Code Documentation
- [ ] Code comments where needed
- [ ] Function/method documentation
- [ ] Complex logic explained

### API Documentation (if applicable)
- [ ] Endpoint documentation updated
- [ ] Request/response examples
- [ ] Error codes documented

### User Documentation (if applicable)
- [ ] README updated
- [ ] User guides updated
- [ ] Changelog updated

## Deployment Complete

### Release
- [ ] PR merged
- [ ] Deployment successful
- [ ] No deployment errors

### Verification
- [ ] **E2E tests pass against production/staging**
- [ ] Smoke tests pass in production
- [ ] Feature works as expected
- [ ] No increase in error rates
- [ ] Performance acceptable

### Monitoring
- [ ] Alerts configured
- [ ] Dashboards updated
- [ ] Logging in place

## Cleanup

### Temporary Items
- [ ] Feature flags removed (if used and stable)
- [ ] Debug code removed
- [ ] Test data cleaned up
- [ ] Temporary files removed

### Documentation
- [ ] Design doc finalized
- [ ] Task breakdown archived
- [ ] Research notes archived
- [ ] Lessons learned documented (if any)

### Workflow State
- [ ] All phases marked complete
- [ ] `currentPhase` set to "complete"
- [ ] `completedAt` timestamp set
- [ ] All artifacts recorded

## Follow-up Items

### Identified During Work
- [ ] Future enhancements documented
- [ ] Technical debt noted
- [ ] Improvement ideas captured
- [ ] Follow-up tickets created (if needed)

### Communication
- [ ] Stakeholders notified of completion
- [ ] Team updated (if relevant)
- [ ] Release notes prepared (if needed)

## Final Sign-off

- [ ] All checklist items addressed
- [ ] No blocking issues remain
- [ ] Workflow state updated to complete
- [ ] Ready to close the story/issue
