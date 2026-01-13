# Design Phase Checklist

Use this checklist to ensure complete design before implementation.

## Requirements Coverage

### Functional Requirements
- [ ] All explicit requirements addressed
- [ ] All implicit requirements considered
- [ ] Edge cases identified and handled
- [ ] Error scenarios planned

### Non-Functional Requirements
- [ ] Performance requirements addressed
- [ ] Security requirements addressed
- [ ] Scalability considered
- [ ] Maintainability considered

## Architecture

### System Design
- [ ] Component boundaries defined
- [ ] Data flow documented
- [ ] Integration points specified
- [ ] No unnecessary complexity

### Consistency
- [ ] Follows existing architecture patterns
- [ ] Uses established conventions
- [ ] Doesn't introduce conflicting patterns
- [ ] Fits with overall system design

## API Design (if applicable)

### Endpoints
- [ ] All required endpoints defined
- [ ] HTTP methods appropriate
- [ ] URL patterns consistent with existing APIs
- [ ] Versioning considered

### Contracts
- [ ] Request schemas specified
- [ ] Response schemas specified
- [ ] Error responses defined
- [ ] Status codes appropriate

### Security
- [ ] Authentication requirements specified
- [ ] Authorization rules defined
- [ ] Input validation planned
- [ ] Rate limiting considered

## Data Model (if applicable)

### Schema Design
- [ ] Tables/collections defined
- [ ] Fields and types specified
- [ ] Relationships documented
- [ ] Constraints identified

### Data Integrity
- [ ] Required vs optional fields clear
- [ ] Foreign keys/references valid
- [ ] Indexes planned for queries
- [ ] Migration strategy defined

### Backward Compatibility
- [ ] Existing data handled
- [ ] Breaking changes identified
- [ ] Migration path documented
- [ ] Rollback possible

## Decisions Documented

### For Each Decision
- [ ] Context explained (why decision needed)
- [ ] Options considered (at least 2)
- [ ] Trade-offs analyzed
- [ ] Selected option justified
- [ ] Risks acknowledged

### Key Decisions Covered
- [ ] Technology/library choices
- [ ] Architectural approaches
- [ ] Trade-offs accepted
- [ ] Scope decisions

## Risk Assessment

### Risks Identified
- [ ] Technical risks listed
- [ ] Integration risks considered
- [ ] Performance risks assessed
- [ ] Security risks evaluated

### Mitigations Planned
- [ ] Each risk has mitigation strategy
- [ ] Fallback options identified
- [ ] Monitoring planned for risks
- [ ] Acceptance criteria for risk items

## Test Architecture (CRITICAL)

### E2E Test Plan
- [ ] **E2E test scenarios defined for each acceptance criterion**
- [ ] **E2E test file locations specified**
- [ ] **Test dependencies (fixtures, mocks) identified**
- [ ] **Test isolation strategy defined**

### Test Infrastructure
- [ ] **Existing test patterns referenced**
- [ ] **New fixtures/helpers needed are identified**
- [ ] **Test data setup documented**
- [ ] **Cleanup strategy defined**

## Implementation Guidance

### For Implementers
- [ ] Clear enough to implement
- [ ] Ambiguous areas clarified
- [ ] Patterns to follow referenced
- [ ] Gotchas and warnings noted
- [ ] **E2E tests to write FIRST are specified**

### Task Readiness
- [ ] Can be broken into tasks
- [ ] Dependencies are clear
- [ ] No blocking unknowns
- [ ] Estimable scope
- [ ] **Test tasks included in breakdown**

## Sign-off

### Document Complete
- [ ] All sections filled in
- [ ] No TBD items remaining
- [ ] Reviewed for clarity
- [ ] Examples provided where helpful

### Artifacts
- [ ] Design doc saved to `docs/design-[feature].md`
- [ ] Workflow state updated with artifact path
- [ ] Ready to proceed to Decompose phase
