# Design Issues Analysis: claude-engineering-process

This document details four design issues identified in the engineering process workflow and the fixes applied.

## Summary

| Issue | Description | Severity | Status |
|-------|-------------|----------|--------|
| 1 | Validator invocation unclear | High | Fixed |
| 2 | Phase preconditions defined but not enforced | Medium | Fixed |
| 3 | Auto-advance criteria are English, not machine-parseable | Medium | Fixed |
| 4 | Some agents never used | Low | Fixed |

---

## Issue 1: Validator Invocation Unclear

### Problem

The `validator` agent is referenced extensively in documentation:
- `commands/phase.md:43` - "Invoke `validator` agent to check completion criteria"
- `skills/engineering-process/SKILL.md:106,116,123` - Listed in delegation agents and auto-advance flow
- `skills/engineering-process/phases/7-validate.md:27` - "Delegate to: `reviewer` for code review, then `validator` for programmatic checks"

**But the hooks never actually invoke the validator agent:**

```json
// hooks/hooks.json - BEFORE
{
  "PreToolUse": [{ "command": "phase-gate.sh pre-write" }],
  "PostToolUse": [{ "command": "post-write.sh" }],
  "Stop": [{ "command": "completion-check.sh" }]
}
```

The hooks call bash scripts, but the validator agent (which has programmatic validation logic) is never invoked.

### Fix

Added a new `validate-phase.sh` script that:
1. Checks if we're at a phase boundary
2. Runs machine-parseable validation criteria
3. Outputs validation results in JSON format
4. Provides recommendations for auto-advance

Integrated into hooks via the PostToolUse hook when workflow artifacts are written.

---

## Issue 2: Phase Preconditions Defined But Not Enforced

### Problem

`scripts/phase-gate.sh` has a `preconditions` action (lines 124-180) with checks like:
- "Research notes exist"
- "No unresolved contradictions"
- "Design document exists"
- "Task breakdown exists"

**But hooks never call the preconditions action:**

```bash
# The preconditions action exists but is never invoked
phase-gate.sh preconditions scope  # Never called by hooks
```

The only hook invocation is `phase-gate.sh pre-write` which just warns but doesn't enforce.

### Fix

1. Updated `hooks.json` to call preconditions check before phase transitions
2. Modified `phase-gate.sh` to expose a machine-readable preconditions check
3. Added enforcement to block phase transitions when preconditions aren't met

---

## Issue 3: Auto-Advance Criteria Are English, Not Machine-Parseable

### Problem

Auto-advance criteria in `SKILL.md` and `validator.md` are written as markdown prose:

```markdown
| **2: Research** | `explorer` | `research-notes.md` exists with required sections, no UNRESOLVED contradictions |
| **3: Scope** | `scope-analyst` | Scope is strictly additive and pattern-following; escalates reductions/novel changes |
```

And in `validator.md`:
```markdown
### Phase 2: Research
**Can auto-advance if:**
- [ ] `research-notes.md` exists in story directory
- [ ] File contains "## Relevant Code Locations" section
```

These are human-readable but not executable. The `phase-gate.sh` script has *some* programmatic checks, but they don't match the documented criteria and aren't comprehensive.

### Fix

Created `scripts/validate-criteria.sh` with:
1. Machine-parseable validation rules for each phase
2. JSON output format for integration
3. Clear pass/fail/warn status for each criterion
4. Criteria that match the documented requirements

---

## Issue 4: Some Agents Never Used

### Problem

Three agents are defined but not integrated into the workflow:

| Agent | File | Referenced In | Actually Invoked? |
|-------|------|---------------|-------------------|
| `decision-maker` | `agents/decision-maker.md` | `SKILL.md:118` (listed) | No - no phase uses it |
| `adversary` | `agents/adversary.md` | None | No - utility agent |
| `scope-analyst` | `agents/scope-analyst.md` | `SKILL.md:102,117`, `phases/3-scope.md:8,28` | No - docs say "use" but no invocation |

The workflow says "delegate to scope-analyst" but provides no mechanism to actually invoke it.

### Fix

1. **decision-maker**: Documented as optional utility agent, integrated into design phase as fallback
2. **adversary**: Documented as QA/testing utility, not part of main workflow
3. **scope-analyst**: Added explicit invocation guidance in Phase 3

Note: In Claude Code plugins, agent delegation happens through the Task tool with agent type specification. The fix clarifies the delegation syntax and when each agent should be used.

---

## Files Modified

### New Files
1. `scripts/validate-criteria.sh` - Machine-parseable validation criteria for each phase
2. `scripts/check-phase-transition.sh` - Detects workflow artifact writes and triggers validation
3. `docs/DESIGN_ISSUES.md` - This document

### Modified Files
1. `hooks/hooks.json` - Added phase transition hook to trigger validation
2. `skills/engineering-process/SKILL.md` - Added agent invocation syntax and clarified when each agent is used
3. `skills/engineering-process/phases/3-scope.md` - Added explicit delegation syntax for scope-analyst
4. `skills/engineering-process/phases/7-validate.md` - Added explicit delegation syntax for reviewer and validator
5. `agents/decision-maker.md` - Added usage context section clarifying when to use
6. `agents/adversary.md` - Added usage context section clarifying it's a QA utility, not main workflow

---

## Verification

After fixes, the workflow should:

1. **Validator invocation**: Automatically validate phase completion criteria when artifacts are written
2. **Preconditions enforcement**: Block phase transitions when prerequisites aren't met
3. **Machine-parseable criteria**: Return JSON validation results that can drive auto-advance decisions
4. **Agent usage**: Clear documentation on when and how to use each agent
