# Phase 8: Deploy

## Purpose
Release the implementation to production and verify it works correctly in the live environment.

## Agent
**Can delegate to: `implementer`** (for deployment tasks)

May be handled in main conversation depending on deployment complexity.

## Activities

### 1. Pre-Deployment Checklist
Before deploying:
- [ ] All tests pass in CI
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Database migrations ready (if any)
- [ ] Feature flags configured (if used)
- [ ] Rollback plan documented

### 2. Create Pull Request
If not already done:
```bash
# Create PR with summary
gh pr create --title "[Feature] Description" --body "..."
```

Use [PR template](../templates/pr-description.md) for description.

### 3. Deployment
Execute the deployment:
- Merge PR to main/production branch
- Or trigger deployment pipeline
- Or manual deployment steps

### 4. Database Migrations
If schema changes:
- Run migrations in correct order
- Verify data integrity
- Have rollback scripts ready

### 5. Post-Deployment Verification
Immediately after deployment:
- Smoke test core functionality
- Check error rates in monitoring
- Verify logs for issues
- Test the specific feature

### 6. Monitoring Setup
Ensure visibility:
- Alerts configured for errors
- Dashboards showing relevant metrics
- Logging captures important events

## Deployment Strategies

### Standard Merge
For low-risk changes:
1. Merge PR
2. Auto-deploy triggers
3. Monitor

### Feature Flag
For higher-risk changes:
1. Deploy with flag disabled
2. Enable for subset of users
3. Monitor and gradually expand
4. Remove flag when stable

### Blue-Green
For critical changes:
1. Deploy to inactive environment
2. Verify in inactive
3. Switch traffic
4. Keep old environment ready for rollback

## Rollback Plan

Document before deploying:
```markdown
## Rollback: [Feature Name]

### Trigger Conditions
- Error rate exceeds X%
- Response time exceeds Yms
- Critical functionality broken

### Rollback Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Data Considerations
- [Any data that needs rollback]
- [Migrations to reverse]

### Communication
- Notify: [Who to inform]
- Channels: [Where to communicate]
```

## PR Description Template

```markdown
## Summary
[Brief description of changes]

## Changes
- [Change 1]
- [Change 2]

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Deployment Notes
- [ ] Database migration required
- [ ] Config changes required
- [ ] Feature flag: [name]

## Rollback
[Link to rollback plan or brief description]

## Related
- Design doc: [link]
- Task breakdown: [link]
- Issue: [link]
```

## Post-Deployment Tasks

### Immediate (within 1 hour)
- [ ] Smoke test in production
- [ ] Check error monitoring
- [ ] Verify metrics
- [ ] Confirm with stakeholders

### Short-term (within 1 day)
- [ ] Monitor for edge cases
- [ ] Gather initial feedback
- [ ] Address any issues

### Cleanup (within 1 week)
- [ ] Remove feature flags (if used)
- [ ] Archive temporary documentation
- [ ] Update permanent documentation
- [ ] Close related tickets/issues

## Completion Criteria

- [ ] PR merged
- [ ] Deployment successful
- [ ] Post-deployment verification passed
- [ ] Monitoring confirms stability
- [ ] Stakeholders notified
- [ ] Workflow state marked complete

## Handling Deployment Issues

### Deployment Fails
1. Check CI/CD logs for errors
2. Fix the issue
3. Re-run deployment
4. If blocked, escalate

### Post-Deployment Issues
1. Assess severity
2. If critical: rollback immediately
3. If minor: fix forward
4. Document what happened

### Rollback Required
1. Execute rollback plan
2. Communicate to stakeholders
3. Investigate root cause
4. Fix and re-deploy

## Workflow Complete

When deployment is stable:

1. Update workflow state:
```json
{
  "currentPhase": "complete",
  "completedAt": "ISO timestamp"
}
```

2. Summarize the work:
   - What was delivered
   - Any deviations from plan
   - Follow-up items identified

3. Celebrate the completion!
