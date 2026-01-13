# Requirements Verification Checklist

Use this checklist during Phase 1 (Understand) to ensure requirements are verified before proceeding to implementation. A requirement that passes all these checks is much less likely to cause wasted implementation effort.

## Quick Verification (Always Do)

- [ ] **No obvious contradictions** - Requirements don't conflict with each other
- [ ] **Preconditions exist** - Required entities, capabilities, and infrastructure are present
- [ ] **Scope is clear** - "In scope" and "out of scope" are explicitly defined
- [ ] **Acceptance criteria are testable** - Can write a test that verifies completion

## Full Verification (For Non-Trivial Features)

### 1. Contradiction Detection

- [ ] Encoded requirements as logical statements
- [ ] Checked against existing codebase constraints
- [ ] Checked against project conventions (CLAUDE.md, README)
- [ ] Checked against previous decisions in this session
- [ ] No UNRESOLVED contradictions remain

**Evidence**: List any contradictions found and their resolutions:
```
Contradiction: [description]
Resolution: [how resolved]
```

### 2. Precondition Verification

- [ ] **Entities verified**
  - [ ] All referenced entities exist in the codebase
  - [ ] Entity relationships are as assumed
  - [ ] Entity capabilities match requirements

- [ ] **System capabilities verified**
  - [ ] Required services/integrations exist
  - [ ] APIs have necessary endpoints
  - [ ] Permissions model supports the requirement

- [ ] **State assumptions verified**
  - [ ] Required states are reachable
  - [ ] State transitions are possible
  - [ ] No blocking states exist

- [ ] **Infrastructure verified**
  - [ ] Required infrastructure exists (DB, cache, queues)
  - [ ] Configuration supports the requirement
  - [ ] Environment variables are documented

**Evidence**: Precondition verification table:
| Precondition | Status | Evidence |
|--------------|--------|----------|
| [precondition] | VERIFIED/MISSING | [file:line or explanation] |

### 3. Ambiguity Resolution

- [ ] **Counterfactual probes answered**
  - [ ] Alternative approaches considered
  - [ ] Quantitative bounds defined
  - [ ] Edge cases documented

- [ ] **Example scenarios created**
  - [ ] Happy path scenario defined
  - [ ] Error scenarios defined
  - [ ] Multi-user scenarios defined (if applicable)
  - [ ] User has confirmed expected behavior for each

- [ ] **Stupid user test passed**
  - [ ] Scope ambiguities resolved (who/what)
  - [ ] Timing ambiguities resolved (when)
  - [ ] Location ambiguities resolved (where)
  - [ ] Behavior ambiguities resolved (how)

**Evidence**: List ambiguities found and their resolutions:
```
Ambiguity: [description]
Resolution: [user-confirmed answer]
```

### 4. Temporal Logic (For Workflows/Processes)

- [ ] No deadlocks in process flow
- [ ] No race conditions in happy path
- [ ] Error recovery paths exist
- [ ] No unbounded waits
- [ ] All "eventually" conditions have triggers

**Evidence**: Process flow diagram or description showing verification.

### 5. Ontology Type-Check

- [ ] All subjects (actors/roles) exist in system
- [ ] All actions are valid for their objects
- [ ] All objects (entities) exist
- [ ] Edge cases identified for entity states

**Evidence**: Type-check table:
| Operation | Subject | Action | Object | Valid? |
|-----------|---------|--------|--------|--------|
| [operation] | [role] | [verb] | [entity] | YES/NO + reason |

### 6. Simulation Walkthrough

- [ ] Simulated user journey step-by-step
- [ ] No stuck points in simulation
- [ ] All decision points have clear outcomes
- [ ] Error states have recovery paths

**Evidence**: Simulation notes showing each step and outcome.

## Verification Status

### Summary

| Check | Status | Notes |
|-------|--------|-------|
| Contradiction Detection | ⬜ PENDING / ✅ PASS / ❌ FAIL | |
| Precondition Verification | ⬜ PENDING / ✅ PASS / ❌ FAIL | |
| Ambiguity Resolution | ⬜ PENDING / ✅ PASS / ❌ FAIL | |
| Temporal Logic | ⬜ PENDING / ✅ PASS / ❌ FAIL / ⏭️ N/A | |
| Ontology Type-Check | ⬜ PENDING / ✅ PASS / ❌ FAIL | |
| Simulation Walkthrough | ⬜ PENDING / ✅ PASS / ❌ FAIL | |

### Overall Status

- [ ] **VERIFIED** - All checks pass, proceed to Phase 2
- [ ] **NEEDS_CLARIFICATION** - Questions must be answered before proceeding
- [ ] **BLOCKED** - Critical issues must be resolved

### Outstanding Questions

List any questions that must be answered before implementation:

1. [Question] - Priority: HIGH/MEDIUM/LOW
2. [Question] - Priority: HIGH/MEDIUM/LOW

### Assumptions Made

List assumptions made during verification (document for later validation):

1. [Assumption] - Will verify during: [phase]
2. [Assumption] - Will verify during: [phase]

---

## When to Use This Checklist

| Scenario | Verification Level |
|----------|-------------------|
| Simple bug fix | Quick Verification only |
| New feature (small) | Quick + Sections 1-3 |
| New feature (medium) | Full Verification |
| New feature (complex) | Full Verification + invoke requirements-verifier agent |
| Refactoring | Quick + Sections 2, 4-5 |
| Integration work | Full Verification |

## Related Resources

- [Verification Guide](../VERIFICATION_GUIDE.md) - Detailed technique explanations
- [Requirements Verifier Agent](../../../agents/requirements-verifier.md) - Automated verification
