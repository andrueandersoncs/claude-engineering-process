# Verification Guide

This guide covers verification techniques for both **requirements** (before implementation) and **software** (during/after implementation). Verification is about making implicit assumptions explicit and catching errors as early as possible.

## The Two Verification Domains

### Requirements Verification (Pre-Implementation)
> "User requests are specifications, just terrible ones."

A user saying "make the button work" is a spec. It's just incomplete, ambiguous, and possibly inconsistent. Requirements verification detects and resolves these issues BEFORE wasting cycles on implementation.

**Goal**: Verify that the agent's understanding matches the user's intent closely enough that implementation won't be wasted effort.

### Software Verification (During/Post-Implementation)
> "The really interesting frontier is closing the loop: verification failures become structured feedback."

Code can be correct syntactically but wrong semantically. Software verification techniques catch bugs that tests alone miss.

**Goal**: Verify that the code does what the requirements specify, handles edge cases, and maintains invariants.

---

## Part 1: Requirements Verification Techniques

### 1.1 Contradiction Detection via Logical Encoding

Encode requirements as logical statements and check for conflicts.

**When to use**: Always, for any non-trivial request.

**Process**:
1. Extract explicit requirements from user request
2. Identify implicit constraints from codebase and prior context
3. Check for unsatisfiable combinations

**Example**:
```
Requirement A: "Form submits without page refresh"
Requirement B: "Must work without JavaScript" (from project constraints)
Status: CONTRADICTION - AJAX requires JavaScript
```

**Resolution approaches**:
- Ask user to relax one constraint
- Identify alternative approaches (progressive enhancement)
- Document the tradeoff explicitly

### 1.2 Precondition Inference

Enumerate what must be true for the request to make sense.

**When to use**: Before starting any task.

**Categories to check**:
| Category | Question | How to Verify |
|----------|----------|---------------|
| Entities | What entities does this assume exist? | Search codebase for models/types |
| Capabilities | What system capabilities are assumed? | Check for integrations/services |
| State | What state must the system be in? | Trace user flows |
| Infrastructure | What infrastructure is required? | Check config files, docker-compose |

**Output**: List of verified/unverified preconditions with evidence.

### 1.3 Counterfactual Probing

Generate variations to reveal hidden constraints.

**When to use**: When requirements seem simple but might hide complexity.

**Probe types**:
- **Alternative approaches**: "Would X also satisfy this?"
- **Quantitative bounds**: "What's the threshold for 'fast'?"
- **Edge cases**: "What if there are zero/million items?"
- **Failure modes**: "What happens when Y is unavailable?"

### 1.4 Example-Driven Disambiguation

Show concrete scenarios instead of asking abstract questions.

**When to use**: When requirements are ambiguous.

**Format**:
```
SCENARIO: Concurrent Edit Conflict
Given: User A opens document at 10:00
And: User B opens same document at 10:01
When: User A saves changes at 10:05
And: User B saves different changes at 10:06
Then: Should User B see [conflict dialog] or [silent merge] or [last-write-wins]?
```

### 1.5 The "Stupid User" Test

Deliberately misinterpret the request in plausible ways.

**When to use**: Always, as a sanity check.

**Categories**:
- Scope: "users" = all users or just admins?
- Timing: immediately or eventually consistent?
- Location: where in the UI?
- Behavior: what exactly is "working"?

**Rule**: If multiple interpretations survive, clarification is required.

### 1.6 Temporal Logic for Workflows

Check process descriptions for logical issues.

**When to use**: When the request describes a multi-step process.

**Check for**:
- **Deadlocks**: A requires B, B requires A
- **Race conditions**: Unprotected concurrent access
- **Missing recovery**: No path back from error states
- **Unbounded waits**: Processes that might never complete

### 1.7 Type-Check Against Ontology

Parse requests into typed operations and verify types exist.

**When to use**: When request references entities or actions.

**Process**:
```
Request: "Let admins delete any comment"

Parsed:
  Subject: Admin (role type)
  Action: delete (operation)
  Object: Comment (entity type)

Verification:
- Admin role exists? → Check auth system
- Delete operation valid for Comments? → Check permissions
- Edge cases? → Comments on deleted posts, archived threads
```

### 1.8 Simulation Before Implementation

Walk through user stories step by step.

**When to use**: For any feature affecting user flows.

**At each step ask**:
- What could go wrong?
- What's undefined?
- How does the user recover?
- What state is the system in?

**If simulation gets stuck**: You've found underspecification.

---

## Part 2: Software Verification Techniques

### 2.1 The Verification Pyramid

Layer verification techniques by cost and thoroughness:

```
┌─────────────────────────────────────────────────────────────┐
│                      DEEP CHECKS                            │
│                    (Pre-deployment)                         │
│                                                             │
│  • Model checking (TLA+, Alloy)                            │
│  • Symbolic execution (KLEE, Manticore)                    │
│  • Full mutation testing                                    │
│  • Security-focused fuzzing                                │
├─────────────────────────────────────────────────────────────┤
│                    MEDIUM CHECKS                            │
│                 (Phase transitions)                         │
│                                                             │
│  • Property-based testing (Hypothesis, fast-check)         │
│  • Metamorphic testing                                      │
│  • Quick mutation testing (sampling)                        │
│  • Coverage-guided fuzzing                                  │
│  • Differential testing                                     │
├─────────────────────────────────────────────────────────────┤
│                     FAST CHECKS                             │
│                    (Every edit)                             │
│                                                             │
│  • Type checking (tsc, mypy)                               │
│  • Linting (eslint, ruff)                                  │
│  • Contract assertions                                      │
│  • Unit tests                                               │
│  • Smoke tests                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Property-Based Testing

Test properties that should hold for ALL inputs, not just examples.

**When to use**: Pure functions, serialization, collections.

**Common properties**:
| Property | Formula | Example |
|----------|---------|---------|
| Idempotence | f(f(x)) = f(x) | Formatting, normalization |
| Roundtrip | decode(encode(x)) = x | Serialization |
| Commutativity | f(a,b) = f(b,a) | Set operations |
| Associativity | f(f(a,b),c) = f(a,f(b,c)) | Merge operations |
| Identity | f(x, identity) = x | Monoid operations |

**Tools by language**:
- Python: Hypothesis
- JavaScript/TypeScript: fast-check
- Rust: proptest
- Java: jqwik

### 2.3 Mutation Testing

Verify tests actually catch bugs by introducing mutations.

**When to use**: Critical code where test confidence matters.

**How it works**:
1. Make small changes (mutations) to code
2. Run tests against mutated code
3. If tests still pass, they're weak (mutant "survived")
4. Mutation score = killed mutants / total mutants

**Mutation types**:
- Statement deletion
- Operator replacement (+ → -)
- Constant modification
- Conditional boundary changes

**Tools by language**:
- JavaScript/TypeScript: Stryker
- Python: mutmut
- Rust: cargo-mutants
- Java: PIT

**Target scores**:
- < 60%: Tests need significant improvement
- 60-80%: Acceptable for most code
- > 80%: Good for critical paths

### 2.4 Fuzzing

Generate random/semi-random inputs to find crashes and bugs.

**When to use**: Parsers, deserializers, anything handling untrusted input.

**Fuzzing strategies**:

| Strategy | Description | Best for |
|----------|-------------|----------|
| Dumb fuzzing | Random bytes | Protocol handlers |
| Grammar-based | Valid structure, random values | Parsers |
| Coverage-guided | Maximize code paths | General use |
| Mutation-based | Modify valid inputs | Format handlers |

**Tools**:
- General: AFL++, libFuzzer
- Python: Hypothesis (in fuzzing mode)
- JavaScript: jsfuzz
- Go: go-fuzz

### 2.5 Metamorphic Testing

Test relationships between outputs when you can't know the "right" answer.

**When to use**: Complex calculations, ML models, simulations.

**Metamorphic relation examples**:
```
MR1: sort(sort(x)) == sort(x)                    # Idempotence
MR2: |search(q, data)| <= |search(q', data)|     # Broader query = more results
MR3: encrypt(decrypt(x, k), k) == x              # Inverse
MR4: distance(a, b) == distance(b, a)            # Symmetry
MR5: total(items) == sum(total(partition(items))) # Partition
```

### 2.6 Differential Testing

Compare multiple implementations of the same spec.

**When to use**: Refactoring, migrations, cross-platform code.

**Process**:
1. Identify reference implementation
2. Generate diverse test inputs
3. Run through both implementations
4. Compare outputs
5. Investigate disagreements

**Applications**:
- New optimizer vs. naive algorithm
- Migrated database vs. original
- Cross-browser JavaScript behavior

### 2.7 Symbolic Execution

Explore all possible execution paths systematically.

**When to use**: Security-critical code, complex branching.

**Tools**:
- C/C++: KLEE, angr
- Java: Java PathFinder
- Binary: Manticore

**Limitations**:
- Path explosion in loops
- External dependencies
- Resource intensive

### 2.8 Model Checking

Verify system properties hold across all states.

**When to use**: Distributed systems, concurrent code, protocols.

**Tools**:
- TLA+: State machine specification
- Alloy: Relational modeling
- Spin: Protocol verification

**What to specify**:
- Safety: Bad things never happen
- Liveness: Good things eventually happen
- Fairness: All parties make progress

### 2.9 Invariant Inference

Discover implicit invariants from execution.

**When to use**: Legacy code, pre-refactoring analysis.

**Tools**:
- Daikon: Dynamic invariant detection
- EvoSuite: Java test generation

**Process**:
1. Run code on representative inputs
2. Tool observes variable states at program points
3. Tool infers likely invariants
4. Add as assertions or property tests

---

## Part 3: Integration with Engineering Process

### Phase-by-Phase Verification

| Phase | Requirements Verification | Software Verification |
|-------|--------------------------|----------------------|
| **1: Understand** | Full requirements verification | - |
| **2: Research** | Verify preconditions against codebase | Discover existing verification patterns |
| **3: Scope** | Verify scope doesn't contradict existing | - |
| **4: Design** | - | Design test architecture, choose techniques |
| **5: Decompose** | - | Assign verification per task |
| **6: Implement** | - | Fast checks (every edit), contracts |
| **7: Validate** | - | Medium + deep checks |
| **8: Deploy** | - | Full verification suite |

### Verification Checklists

- [Requirements Verification Checklist](checklists/requirement-verification-checklist.md)
- [Software Verification Checklist](checklists/software-verification-checklist.md)

### Related Agents

- [Requirements Verifier](../../agents/requirements-verifier.md): Automated requirements verification
- [Verification Advisor](../../agents/verification-advisor.md): Recommend verification techniques

---

## Quick Reference: When to Use What

### Requirements Verification

| Situation | Techniques |
|-----------|------------|
| New feature request | All techniques (full verification) |
| Bug report | Precondition inference, simulation |
| Refactoring request | Type-check ontology, temporal logic |
| Integration work | Contradiction detection, preconditions |

### Software Verification

| Code Type | Primary | Secondary |
|-----------|---------|-----------|
| Parser/deserializer | Fuzzing | Property tests |
| Business logic | Mutation testing | Contracts |
| API endpoint | Property tests | Differential |
| State machine | Model checking | Property tests |
| Security-critical | Fuzzing + symbolic | Mutation testing |
| ML/AI | Metamorphic | Differential |

---

## The Meta-Insight

> "The agent that systematically externalizes and checks assumptions will waste far less time building the wrong thing."

Verification isn't about proving code is correct — it's about:
1. **Surfacing assumptions** before they become bugs
2. **Catching errors early** when they're cheap to fix
3. **Building confidence** that matches the actual risk
4. **Creating feedback loops** that improve understanding

The magic happens when verification failures don't just reject code — they become structured feedback that helps you understand WHY something failed and WHAT to try differently.
