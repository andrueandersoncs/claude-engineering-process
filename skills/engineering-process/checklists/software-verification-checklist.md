# Software Verification Checklist

Use this checklist during Phase 6 (Implement) and Phase 7 (Validate) to ensure code is properly verified before deployment. The verification level should match the risk level of the code being changed.

## Quick Reference: Risk-Based Verification

| Risk Level | Examples | Minimum Verification |
|------------|----------|---------------------|
| **Low** | Internal tooling, dev scripts | Fast checks only |
| **Medium** | User-facing features, APIs | Fast + medium checks |
| **High** | Auth, payments, data handling | Fast + medium + selected deep |
| **Critical** | Security, financial, safety | All verification levels |

---

## Fast Checks (Every Edit)

These checks should run automatically on every code change.

### Type Safety
- [ ] Type checking passes (`tsc`, `mypy`, etc.)
- [ ] No `any` types in new code (TypeScript)
- [ ] No type: ignore comments without explanation
- [ ] Strict mode enabled for critical files

### Static Analysis
- [ ] Linting passes (zero errors)
- [ ] No security warnings from linter
- [ ] Code complexity within limits
- [ ] No unused variables/imports

### Unit Tests
- [ ] All existing unit tests pass
- [ ] New code has unit tests
- [ ] Unit test coverage meets threshold (if configured)
- [ ] No skipped tests without explanation

### Contracts & Assertions
- [ ] Preconditions checked at function entry
- [ ] Postconditions verified at function exit
- [ ] Critical invariants have assertions
- [ ] Assertions are meaningful (not just `assert true`)

**Status**: ⬜ PENDING / ✅ PASS / ❌ FAIL

---

## Medium Checks (Phase Transitions)

These checks should run before advancing phases or merging code.

### Property-Based Testing

**When to apply**: Pure functions, serialization, data transformations

- [ ] Identified properties that should hold for all inputs
- [ ] Property tests written using appropriate framework:
  - [ ] Python: Hypothesis
  - [ ] TypeScript/JS: fast-check
  - [ ] Rust: proptest
  - [ ] Other: ___________
- [ ] Common properties tested:
  - [ ] Roundtrip (encode/decode)
  - [ ] Idempotence (where applicable)
  - [ ] Commutativity (where applicable)
- [ ] Property tests pass with default iterations (100+)

**Evidence**: Property tests location: `[path to tests]`

### Mutation Testing

**When to apply**: Critical business logic, security-sensitive code

- [ ] Mutation testing tool configured:
  - [ ] TypeScript/JS: Stryker
  - [ ] Python: mutmut
  - [ ] Rust: cargo-mutants
  - [ ] Java: PIT
  - [ ] Other: ___________
- [ ] Mutation testing run on changed files
- [ ] Mutation score acceptable for risk level:
  - [ ] Low risk: > 50%
  - [ ] Medium risk: > 65%
  - [ ] High risk: > 80%
- [ ] Surviving mutants reviewed and either:
  - [ ] Tests added to kill them, OR
  - [ ] Documented as acceptable

**Evidence**: Mutation score: ___% | Report: `[path]`

### Fuzzing

**When to apply**: Parsers, deserializers, input handlers

- [ ] Fuzzing target identified
- [ ] Fuzzer configured:
  - [ ] Python: Hypothesis fuzzing mode
  - [ ] C/C++: AFL++, libFuzzer
  - [ ] Go: go-fuzz
  - [ ] JS: jsfuzz
  - [ ] Other: ___________
- [ ] Fuzzing run for minimum duration (10 min quick, 1 hr thorough)
- [ ] No crashes found OR all crashes fixed
- [ ] Edge cases from fuzzing added as regression tests

**Evidence**: Fuzzing duration: ___ | Crashes found: ___ | Fixed: ___

### Metamorphic Testing

**When to apply**: Complex calculations, ML models, search/filter operations

- [ ] Metamorphic relations identified:
  ```
  MR1: [relation]
  MR2: [relation]
  ```
- [ ] Tests written for each relation
- [ ] All metamorphic tests pass

### Differential Testing

**When to apply**: Refactoring, migrations, algorithm changes

- [ ] Reference implementation identified
- [ ] Test inputs generated (diverse set)
- [ ] Outputs compared between implementations
- [ ] All differences explained or fixed

**Status**: ⬜ PENDING / ✅ PASS / ❌ FAIL / ⏭️ N/A

---

## Deep Checks (Pre-Deploy)

These checks should run before production deployment for high-risk code.

### Full Mutation Testing

- [ ] Mutation testing run on all critical paths
- [ ] Mutation score meets high-risk threshold (> 80%)
- [ ] All surviving mutants documented with justification

### Security-Focused Fuzzing

- [ ] Extended fuzzing run (8+ hours)
- [ ] Corpus from previous fuzzing included
- [ ] Memory safety checked (for native code)
- [ ] No new crashes or vulnerabilities

### Symbolic Execution (Optional)

**When to apply**: Security-critical paths, complex branching

- [ ] Tool selected: KLEE / Manticore / Java PathFinder / Other
- [ ] Critical paths identified for analysis
- [ ] Symbolic execution completed
- [ ] All discovered paths verified
- [ ] No assertion violations found

### Model Checking (Optional)

**When to apply**: Distributed systems, concurrent code, protocols

- [ ] State machine / protocol specified
- [ ] Tool selected: TLA+ / Alloy / Spin / Other
- [ ] Model verified against properties:
  - [ ] Safety properties hold
  - [ ] Liveness properties hold
  - [ ] No deadlocks
  - [ ] No race conditions

### Invariant Verification

- [ ] Runtime invariants identified (from Daikon or manual)
- [ ] Invariants added as assertions or property tests
- [ ] Invariants hold across test suite

**Status**: ⬜ PENDING / ✅ PASS / ❌ FAIL / ⏭️ N/A

---

## Verification Summary

### Code Change Summary

| Metric | Value |
|--------|-------|
| Files changed | |
| Lines added | |
| Lines removed | |
| Risk level | LOW / MEDIUM / HIGH / CRITICAL |

### Check Results

| Level | Check | Status | Notes |
|-------|-------|--------|-------|
| Fast | Type checking | ⬜/✅/❌ | |
| Fast | Linting | ⬜/✅/❌ | |
| Fast | Unit tests | ⬜/✅/❌ | |
| Fast | Contracts | ⬜/✅/❌ | |
| Medium | Property tests | ⬜/✅/❌/⏭️ | |
| Medium | Mutation testing | ⬜/✅/❌/⏭️ | Score: ___% |
| Medium | Fuzzing | ⬜/✅/❌/⏭️ | Duration: ___ |
| Medium | Metamorphic | ⬜/✅/❌/⏭️ | |
| Medium | Differential | ⬜/✅/❌/⏭️ | |
| Deep | Full mutation | ⬜/✅/❌/⏭️ | Score: ___% |
| Deep | Security fuzzing | ⬜/✅/❌/⏭️ | |
| Deep | Symbolic exec | ⬜/✅/❌/⏭️ | |
| Deep | Model checking | ⬜/✅/❌/⏭️ | |
| Deep | Invariants | ⬜/✅/❌/⏭️ | |

### Overall Verification Status

- [ ] **VERIFIED** - All required checks pass for risk level
- [ ] **CONDITIONAL** - Passes with documented exceptions
- [ ] **FAILED** - Must address issues before proceeding

### Issues Found

| Severity | Issue | Status |
|----------|-------|--------|
| CRITICAL | [issue] | OPEN/FIXED |
| MAJOR | [issue] | OPEN/FIXED |
| MINOR | [issue] | OPEN/FIXED |

### Exceptions & Justifications

Document any checks that were skipped or failures that were accepted:

| Check | Reason Skipped/Accepted |
|-------|------------------------|
| [check] | [justification] |

---

## Tool Configuration Quick Reference

### Property-Based Testing

```bash
# Python (Hypothesis)
pip install hypothesis
# In test file:
from hypothesis import given, strategies as st

# TypeScript (fast-check)
npm install fast-check
# In test file:
import * as fc from 'fast-check';
```

### Mutation Testing

```bash
# TypeScript (Stryker)
npm install @stryker-mutator/core
npx stryker init

# Python (mutmut)
pip install mutmut
mutmut run

# Rust
cargo install cargo-mutants
cargo mutants
```

### Fuzzing

```bash
# Python (Hypothesis)
# Use @settings(max_examples=10000) for fuzzing mode

# Go
go install golang.org/x/tools/cmd/go-fuzz
go-fuzz-build && go-fuzz
```

---

## Related Resources

- [Verification Guide](../VERIFICATION_GUIDE.md) - Detailed technique explanations
- [Verification Advisor Agent](../../../agents/verification-advisor.md) - Get recommendations
- [TDD Testing Guide](../TDD_TESTING_GUIDE.md) - Test-first development
