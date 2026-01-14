# Phase 1: Understand

## Purpose
Comprehend the request—not just what's written, but what's meant. Build a mental model of the problem space before considering solutions.

## ⚠️ USER-REQUIRED PHASE

**This phase CANNOT be auto-advanced.** User Story refinement is the contract between user and system. The user must:
- Confirm acceptance criteria
- Resolve all ambiguous scenarios (no `???` markers)
- Answer blocking questions
- Approve the understanding before proceeding

This phase is intentionally high-touch because incorrect understanding cascades through all subsequent phases.

## Agent
None (main conversation handles this phase - requires direct user interaction)

## Activities

### 1. Parse the Input
- If issue URL: Fetch and read the issue content
- If issue number: Locate in the project's issue tracker
- If description: Parse the natural language requirements

### 2. Identify Explicit Requirements
Document what is clearly stated:
- What functionality is requested?
- What behavior is expected?
- What acceptance criteria are provided?

### 3. Identify Implicit Requirements
Surface what's not stated but implied:
- What does the user actually need (vs. what they asked for)?
- What constraints exist from the context?
- What quality attributes matter (performance, security, etc.)?

### 4. Extract the Job To Be Done (JTBD) — CRITICAL

**Before diving into features, understand the underlying job the user is trying to accomplish.**

The JTBD framework asks: What progress is the user trying to make? What outcome do they need?

#### Why This Matters
- Features are negotiable; the job is the real contract
- Understanding the job reveals alternative approaches
- Jobs are more stable than feature requests—they rarely change
- The "so that" clause in user stories preserves the why

#### How to Extract the Job

1. **Ask "Why?" behind the feature request**
   - Request: "Add a CSV export button"
   - Job: "I need to share data with stakeholders who use Excel"
   - Better solution might be: Direct Excel export, scheduled email reports, or dashboard sharing

2. **Identify the context → job → outcome pattern**
   ```
   When [situation/context]
   I want to [job/progress]
   So I can [desired outcome]
   ```

3. **Look for competing alternatives**
   - How do users accomplish this job today? (Workarounds reveal the real need)
   - What would they "hire" if your feature didn't exist?
   - Are there simpler ways to achieve the same outcome?

4. **Validate the job, not just the feature**
   - "If we build this feature, will it actually solve your problem?"
   - "What would success look like for you?"
   - "How will you know when this job is done?"

#### Example JTBD Extraction

```markdown
**Feature Request**: "Add user activity logging"

**Surface-level understanding**:
- Track when users log in
- Record actions taken
- Store in database

**JTBD Analysis**:
- Context: Admin investigating a security incident
- Job: Understand what happened and who was responsible
- Outcome: Quickly answer "who did what and when?" during audits

**Insight**: The job isn't "logging"—it's "incident investigation."
This suggests we also need: search/filter, timeline view, export for compliance.
A simple activity log table might not serve the actual job.
```

### 5. Extract Testable Acceptance Criteria (CRITICAL)
For each requirement, define how it will be verified:
- Convert requirements to "Given/When/Then" format
- Ask: "How will we test that this works?"
- Identify what E2E tests are needed
- Document test scenarios alongside requirements

Example:
```
Requirement: Users can log in with email/password
Test Scenario: Given a registered user, when they enter valid credentials, then they see the dashboard
E2E Test: tests/e2e/user-login.spec.ts
```

### 6. Find Gaps and Ambiguities
List questions that need answers:
- What information is missing?
- What terms are ambiguous?
- What edge cases are unspecified?

### 7. Example-Driven Disambiguation (CRITICAL)
Instead of asking abstract questions, use concrete scenarios to clarify:

**Create scenarios that expose undefined behavior:**

```markdown
### Scenario: Normal Login
- User clicks "Login"
- Enters email: alice@example.com
- Enters password: ****
- Result: Redirected to dashboard ✓

### Scenario: Failed Login (Edge Case)
- User clicks "Login"
- Enters wrong password 3 times
- Result: ??? (Account lockout? CAPTCHA? Just fail again?)
```

**Present scenarios to user** - they react to concrete examples more easily than abstract questions.

Use the template at `templates/scenarios.md` and save to story directory as `scenarios.md`.

### 8. Clarify with User
If there are blocking questions:
- Present the questions clearly using scenarios where possible
- Provide options when possible
- Get explicit answers before proceeding

### 9. Requirements Verification (CRITICAL)

Before proceeding to Research, verify that requirements are complete and consistent using the [Requirements Verification Checklist](../checklists/requirement-verification-checklist.md).

**Core Verification Techniques:**

#### 9.1 Contradiction Detection
Encode requirements and check for conflicts:
- Does this requirement conflict with existing system behavior?
- Does it conflict with other requirements in this story?
- Does it conflict with project constraints (CLAUDE.md, README)?

```
Example:
- Requirement: "Form submits without page refresh"
- Existing constraint: "Must work without JavaScript"
- Status: CONTRADICTION - needs resolution
```

#### 9.2 Precondition Inference
For the request to make sense, what must be true?
- **Entities**: Do required entities exist? (users, posts, permissions)
- **Capabilities**: Does the system have required features? (email, auth)
- **State**: Can the system reach the required state?
- **Infrastructure**: Is required infrastructure available? (DB, cache)

#### 9.3 The "Stupid User" Test
Deliberately misinterpret the request:
- Who exactly is "users"? All users? Admins only?
- What exactly is "fast"? 100ms? 1 second?
- Where should this appear? Main nav? Settings?
- What constitutes "working"?

**If multiple interpretations survive, clarification is required.**

#### 9.4 Temporal Logic (for workflows)
If the request describes a process, check:
- No deadlocks (A requires B, B requires A)
- No race conditions in happy path
- Error recovery paths exist
- No unbounded waits

#### 9.5 Optional: Invoke Requirements Verifier Agent

For complex requirements, delegate to the `requirements-verifier` agent:

```
Task tool call:
  subagent_type: "requirements-verifier"
  prompt: |
    Verify the following requirements for contradictions,
    missing preconditions, and ambiguities:

    [paste requirements here]

    Project context:
    - Existing auth: [describe]
    - Constraints: [list any known constraints]
```

See the [Verification Guide](../VERIFICATION_GUIDE.md) for detailed technique explanations.

### 10. Formal Verification (CRITICAL)

Apply formal verification patterns to ensure requirements are complete and consistent. These produce **structured JSON outputs** that are checked at phase transition.

#### 10.1 SAT/SMT Constraint Encoding

Invoke `requirements-verifier` agent to encode requirements as formal constraints:

```
Task tool call:
  subagent_type: "requirements-verifier"
  prompt: |
    Perform SAT/SMT-style constraint analysis.

    Requirements:
    [paste requirements]

    Known constraints from codebase:
    [list constraints from CLAUDE.md, existing code]

    Output constraint-analysis.json following the schema.
```

**Output**: `constraint-analysis.json` in story directory

**Gate**: If `satisfiability = "UNSAT"`, BLOCK and present `unsat_core` to user.

#### 10.2 LTL Temporal Verification (For Workflows)

If requirements describe a process or workflow, verify temporal properties:

```
Task tool call:
  subagent_type: "requirements-verifier"
  prompt: |
    Model this workflow as a state machine and verify LTL properties.

    Workflow:
    [describe the process]

    Properties to verify:
    - No deadlocks
    - All terminal states are reachable
    - [specific properties from requirements]

    Output ltl-verification.json following the schema.
```

**Output**: `ltl-verification.json` in story directory (workflow features only)

**Gate**: If `deadlocks.length > 0`, BLOCK and present deadlock states to user.

#### 10.3 Preference Consistency Check

Check requirements against historical user preferences:

```
Task tool call:
  subagent_type: "requirements-verifier"
  prompt: |
    Check requirements against .preferences.json.

    Load: <project>/.preferences.json

    Check for:
    - Conflicts with rejected patterns
    - Alignment with preferred patterns
    - Consistency with past decisions

    Output preference-check.json.
```

**Output**: `preference-check.json` in story directory

**Gate**: If hard conflicts exist, WARN user (soft conflicts allow proceed).

#### 10.4 ADVERSARY TESTING (MANDATORY)

**After requirements verification passes, invoke the adversary agent:**

```
Task tool call:
  subagent_type: "adversary"
  prompt: |
    Generate adversarial test cases for these requirements.

    Story: [story-slug]

    Verified requirements:
    [paste from verification report]

    Codebase constraints:
    [list known constraints]

    State machine for scenario generation:
    {
      "entities": ["User", "Post", ...],
      "states": {...},
      "transitions": {...}
    }

    Generate at least 3 adversarial cases using:
    - State combination testing
    - Transition sequence testing
    - Concurrent action testing

    Output adversarial-cases.md.
```

**Output**: `adversarial-cases.md` in story directory

**Gate Condition**: Cannot proceed to Phase 2 without:
- `adversarial-cases.md` exists
- At least 3 adversarial cases generated
- All cases either caught by verification OR documented with resolution

### 11. Update Preferences (After Story Completion)

At the END of the story (not now), update `.preferences.json` with learnings:

```json
// Add to <project>/.preferences.json:
{
  "rejected": [..., {
    "pattern": "[pattern user rejected during this story]",
    "story": "[story-slug]",
    "date": "[today]",
    "reason": "[why rejected]"
  }],
  "preferred": [..., {
    "pattern": "[pattern user preferred]",
    "story": "[story-slug]",
    "date": "[today]"
  }],
  "decisions": [..., {
    "topic": "[decision made]",
    "choice": "[what was chosen]",
    "alternatives_rejected": ["..."],
    "story": "[story-slug]",
    "date": "[today]",
    "rationale": "[why]"
  }]
}
```

## Output

Document in the conversation or a notes file:

```markdown
## Understanding: [Feature Name]

### Request Summary
[One paragraph summarizing what's being asked]

### Job To Be Done (CRITICAL)
**Context**: When [situation/trigger]
**Job**: I want to [progress/action]
**Outcome**: So I can [desired result]

**Current alternatives**: [How users accomplish this today]
**Why this solution**: [Why the proposed approach serves the job]

### Explicit Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Implicit Requirements
- [ ] Inferred requirement 1
- [ ] Inferred requirement 2

### Open Questions
- [ ] Question 1 (blocking: yes/no)
- [ ] Question 2 (blocking: yes/no)

### Assumptions
- Assumption 1 (will verify in research)
- Assumption 2 (will verify in research)

### Test Scenarios (REQUIRED)
| Requirement | Test Scenario | Test Type |
|-------------|---------------|-----------|
| Requirement 1 | Given X, when Y, then Z | E2E |
| Requirement 2 | Given A, when B, then C | E2E |
```

## Completion Criteria

- [ ] Core request is understood and can be summarized
- [ ] **CRITICAL: Job To Be Done is identified and documented** (context → job → outcome)
- [ ] **CRITICAL: Current alternatives are understood** (how users accomplish this today)
- [ ] Explicit requirements are listed
- [ ] Implicit requirements are surfaced
- [ ] Blocking questions are answered (or escalated to user)
- [ ] Assumptions are documented for verification
- [ ] **CRITICAL: Each requirement has a testable acceptance criterion**
- [ ] **CRITICAL: Test scenarios are documented in Given/When/Then format**
- [ ] **CRITICAL: Edge cases explored via concrete scenarios** - `scenarios.md` created if needed
- [ ] **CRITICAL: No scenarios marked with `???` or `UNDEFINED`** - all clarified

### Requirements Verification Criteria
- [ ] **No contradictions** between requirements
- [ ] **Preconditions verified** - required entities/capabilities exist
- [ ] **No ambiguities** - multiple interpretations resolved
- [ ] **Temporal logic checked** (if workflow) - no deadlocks or races
- [ ] [Requirements Verification Checklist](../checklists/requirement-verification-checklist.md) completed (for non-trivial features)

### Formal Verification Criteria (REQUIRED)
- [ ] **CRITICAL: `constraint-analysis.json`** exists with `satisfiability != "UNSAT"`
- [ ] **CRITICAL: `adversarial-cases.md`** exists with at least 3 cases generated
- [ ] **`preference-check.json`** exists with no hard conflicts (soft conflicts OK)
- [ ] **`ltl-verification.json`** exists (if workflow) with no deadlocks

## Common Pitfalls

1. **Solution Jumping** - Thinking about implementation before understanding the problem
2. **Assumption Blindness** - Not recognizing implicit assumptions
3. **Scope Creep** - Adding requirements not in the original request
4. **Ambiguity Tolerance** - Proceeding without clarifying vague requirements

## Next Phase
Proceed to [Phase 2: Research](2-research.md) when criteria are met.
