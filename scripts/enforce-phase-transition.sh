#!/bin/bash
#
# Enforce Phase Transition Verification
#
# This script runs as a PreToolUse hook on Write|Edit operations.
# It detects when workflow-state.json is being modified to change phases
# and BLOCKS the transition unless the required verification passes.
#
# Exit codes:
#   0 - Allow the operation
#   2 - Block the operation (provides feedback to Claude)
#
# Per Claude Code docs:
#   "Exit code 2 blocks the operation and feeds the error message back to Claude"
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORIES_DIR="docs/stories"

# Read hook input from stdin
if [ -t 0 ]; then
    INPUT=""
else
    INPUT=$(cat)
fi

# Extract file path from hook input
FILE_PATH=""
if [ -n "$INPUT" ]; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
fi

# Only care about workflow-state.json writes
if [[ ! "$FILE_PATH" =~ workflow-state\.json$ ]]; then
    exit 0
fi

# Extract the new content being written
NEW_CONTENT=""
if [ -n "$INPUT" ]; then
    NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null || echo "")
fi

# If no content (might be an edit), try to get the file content after edit
# For now, we'll check the target phase from the new content
if [ -z "$NEW_CONTENT" ]; then
    exit 0  # Can't determine target phase, allow
fi

# Extract target phase from new content
TARGET_PHASE=$(echo "$NEW_CONTENT" | jq -r '.currentPhase // empty' 2>/dev/null || echo "")
if [ -z "$TARGET_PHASE" ]; then
    exit 0  # Can't determine target phase, allow
fi

# Extract story slug from file path
STORY_DIR=$(dirname "$FILE_PATH")
STORY_SLUG=$(basename "$STORY_DIR")

# Get current phase from existing file
CURRENT_PHASE="unknown"
if [ -f "$FILE_PATH" ]; then
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$FILE_PATH" 2>/dev/null || echo "unknown")
fi

# If phase isn't changing, allow
if [ "$CURRENT_PHASE" = "$TARGET_PHASE" ]; then
    exit 0
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_block() {
    echo -e "${RED}[BLOCKED]${NC} $1" >&2
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1" >&2
}

# Phase transition enforcement rules
case "$CURRENT_PHASE->$TARGET_PHASE" in
    "understand->research")
        # Must pass requirements verification AND formal verification before leaving understand
        log_info "Phase transition: understand -> research"
        log_info "Running requirements verification..."

        if [ -x "$SCRIPT_DIR/verify-requirements.sh" ]; then
            if ! "$SCRIPT_DIR/verify-requirements.sh" "$STORY_SLUG" 2>&1; then
                log_block "Cannot transition to research: requirements verification failed"
                echo "Run 'verify-requirements.sh $STORY_SLUG' to see details" >&2
                echo "Resolve all ??? markers, UNRESOLVED items, and BLOCKED markers first." >&2
                exit 2
            fi
        fi

        if [ -x "$SCRIPT_DIR/detect-contradictions.sh" ]; then
            if ! "$SCRIPT_DIR/detect-contradictions.sh" "$STORY_SLUG" 2>&1; then
                EXIT_CODE=$?
                if [ $EXIT_CODE -eq 2 ]; then
                    log_block "Cannot transition to research: critical contradictions detected"
                    echo "Run 'detect-contradictions.sh $STORY_SLUG' to see details" >&2
                    exit 2
                fi
                # Exit code 1 is warnings - allow but log
                log_info "Warnings detected but allowing transition"
            fi
        fi

        # === FORMAL VERIFICATION CHECKS ===
        log_info "Running formal verification checks..."

        # Check 1: constraint-analysis.json
        if [ -f "$STORY_DIR/constraint-analysis.json" ]; then
            SAT_RESULT=$(jq -r '.satisfiability // "UNKNOWN"' "$STORY_DIR/constraint-analysis.json" 2>/dev/null || echo "UNKNOWN")
            if [ "$SAT_RESULT" = "UNSAT" ]; then
                log_block "Cannot transition to research: constraints are UNSATISFIABLE"
                echo "Review constraint-analysis.json for unsat_core" >&2
                UNSAT_CORE=$(jq -r '.unsat_core | join(", ")' "$STORY_DIR/constraint-analysis.json" 2>/dev/null || echo "unknown")
                echo "Conflicting constraints: $UNSAT_CORE" >&2
                exit 2
            fi
            log_info "Constraint analysis: $SAT_RESULT"
        else
            log_info "No constraint-analysis.json found (run requirements-verifier agent)"
        fi

        # Check 2: adversarial-cases.md (REQUIRED)
        if [ ! -f "$STORY_DIR/adversarial-cases.md" ]; then
            log_block "Cannot transition to research: adversarial testing not completed"
            echo "Invoke the adversary agent to generate adversarial test cases." >&2
            echo "At least 3 adversarial cases are required before proceeding." >&2
            exit 2
        fi
        # Count cases (look for ### Case pattern or ADV- pattern)
        CASE_COUNT=$(grep -cE "^### Case|^### ADV-|^\*\*id\*\*: \"ADV-" "$STORY_DIR/adversarial-cases.md" 2>/dev/null || echo "0")
        if [ "$CASE_COUNT" -lt 3 ]; then
            log_block "Cannot transition to research: fewer than 3 adversarial cases (found: $CASE_COUNT)"
            echo "Adversary agent must generate at least 3 test cases." >&2
            exit 2
        fi
        log_info "Adversarial testing: $CASE_COUNT cases generated"

        # Check 3: preference-check.json (warn on hard conflicts)
        if [ -f "$STORY_DIR/preference-check.json" ]; then
            HARD_CONFLICTS=$(jq '[.preference_conflicts[]? | select(.conflicts_with.severity == "hard")] | length' "$STORY_DIR/preference-check.json" 2>/dev/null || echo "0")
            if [ "$HARD_CONFLICTS" -gt 0 ]; then
                log_block "Cannot transition to research: $HARD_CONFLICTS hard preference conflicts detected"
                echo "Review preference-check.json and resolve conflicts with user." >&2
                exit 2
            fi
            SOFT_CONFLICTS=$(jq '[.preference_conflicts[]? | select(.conflicts_with.severity == "soft" or .conflicts_with.severity == null)] | length' "$STORY_DIR/preference-check.json" 2>/dev/null || echo "0")
            if [ "$SOFT_CONFLICTS" -gt 0 ]; then
                log_info "Soft preference conflicts: $SOFT_CONFLICTS (allowing with warning)"
            fi
        fi

        # Check 4: ltl-verification.json (if workflow, check for deadlocks)
        if [ -f "$STORY_DIR/ltl-verification.json" ]; then
            DEADLOCKS=$(jq '.verification_result.deadlocks | length' "$STORY_DIR/ltl-verification.json" 2>/dev/null || echo "0")
            if [ "$DEADLOCKS" -gt 0 ]; then
                log_block "Cannot transition to research: workflow has $DEADLOCKS deadlock(s)"
                echo "Review ltl-verification.json for deadlock states." >&2
                DEADLOCK_STATES=$(jq -r '.verification_result.deadlocks | join(", ")' "$STORY_DIR/ltl-verification.json" 2>/dev/null || echo "unknown")
                echo "Deadlock states: $DEADLOCK_STATES" >&2
                exit 2
            fi
            log_info "LTL verification: no deadlocks"
        fi

        echo -e "${GREEN}✓ Requirements and formal verification passed, allowing transition to research${NC}" >&2
        ;;

    "implement->validate")
        # Must pass full validation before entering validate phase
        log_info "Phase transition: implement -> validate"
        log_info "Running full validation suite..."

        if [ -x "$SCRIPT_DIR/run-validation.sh" ]; then
            if ! "$SCRIPT_DIR/run-validation.sh" 2>&1; then
                log_block "Cannot transition to validate: tests/lint failed"
                echo "Run 'run-validation.sh' to see details" >&2
                echo "All tests must pass before entering validation phase." >&2
                exit 2
            fi
        fi

        echo -e "${GREEN}✓ Validation passed, allowing transition to validate${NC}" >&2
        ;;

    "validate->deploy")
        # Must pass mutation tests and fuzzing before deploy
        log_info "Phase transition: validate -> deploy"
        log_info "Running extended verification suite..."

        # Run mutation tests (quick mode for gate)
        if [ -x "$SCRIPT_DIR/run-mutation-tests.sh" ]; then
            log_info "Running mutation tests..."
            if ! "$SCRIPT_DIR/run-mutation-tests.sh" --quick 2>&1; then
                EXIT_CODE=$?
                if [ $EXIT_CODE -eq 1 ]; then
                    log_block "Cannot transition to deploy: mutation score below threshold"
                    echo "Run 'run-mutation-tests.sh' to see details" >&2
                    echo "Mutation score must meet threshold before deployment." >&2
                    exit 2
                elif [ $EXIT_CODE -eq 2 ]; then
                    log_info "Mutation testing not configured - skipping"
                fi
            fi
        fi

        # Run fuzzer (quick mode for gate)
        if [ -x "$SCRIPT_DIR/run-fuzzer.sh" ]; then
            log_info "Running fuzz tests..."
            if ! "$SCRIPT_DIR/run-fuzzer.sh" --quick 2>&1; then
                EXIT_CODE=$?
                if [ $EXIT_CODE -eq 1 ]; then
                    log_block "Cannot transition to deploy: fuzzing found issues"
                    echo "Run 'run-fuzzer.sh' to see details" >&2
                    echo "Fix fuzzing issues before deployment." >&2
                    exit 2
                elif [ $EXIT_CODE -eq 2 ]; then
                    log_info "Fuzzing not configured - skipping"
                fi
            fi
        fi

        echo -e "${GREEN}✓ Extended verification passed, allowing transition to deploy${NC}" >&2
        ;;

    "research->scope"|"scope->design"|"design->decompose"|"decompose->implement")
        # These transitions have lighter gates - just check artifacts exist
        log_info "Phase transition: $CURRENT_PHASE -> $TARGET_PHASE"

        case "$TARGET_PHASE" in
            "scope")
                if [ ! -f "$STORY_DIR/research-notes.md" ]; then
                    log_block "Cannot transition to scope: research-notes.md not found"
                    exit 2
                fi
                ;;
            "design")
                # Scope is typically embedded in workflow state, allow
                ;;
            "decompose")
                if [ ! -f "$STORY_DIR/design.md" ]; then
                    log_block "Cannot transition to decompose: design.md not found"
                    exit 2
                fi
                ;;
            "implement")
                if [ ! -f "$STORY_DIR/tasks.md" ]; then
                    log_block "Cannot transition to implement: tasks.md not found"
                    exit 2
                fi
                ;;
        esac

        echo -e "${GREEN}✓ Artifact check passed, allowing transition${NC}" >&2
        ;;

    *)
        # Unknown or allowed transition
        ;;
esac

exit 0
