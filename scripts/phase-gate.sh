#!/bin/bash
#
# Phase Gate Validation Script
# Validates phase transitions and enforces workflow constraints
#
# Usage:
#   phase-gate.sh [action]
#
# Actions:
#   pre-write  - Validate before write/edit operations
#   check      - Display current phase status
#   validate   - Validate current phase completion
#

set -e

ACTION="${1:-check}"
WORKFLOW_STATE=".claude/workflow-state.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read stdin for hook input (if provided)
if [ -t 0 ]; then
    INPUT=""
else
    INPUT=$(cat)
fi

# Check if we're in a workflow
if [ ! -f "$WORKFLOW_STATE" ]; then
    # No workflow active, allow all operations
    exit 0
fi

# Parse workflow state
CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_STATE" 2>/dev/null || echo "unknown")
COMPLETED_PHASES=$(jq -r '.completedPhases // [] | join(",")' "$WORKFLOW_STATE" 2>/dev/null || echo "")
STORY=$(jq -r '.story // "unknown"' "$WORKFLOW_STATE" 2>/dev/null || echo "unknown")

# Helper function to check if phase is completed
phase_completed() {
    local phase="$1"
    echo "$COMPLETED_PHASES" | grep -q "$phase"
}

case "$ACTION" in
    "pre-write")
        # Validate before write/edit operations

        # Block writes during understand phase
        if [ "$CURRENT_PHASE" = "understand" ]; then
            echo "Phase gate: In 'understand' phase - file modifications not expected yet." >&2
            echo "Tip: Complete requirements analysis before modifying files." >&2
            # Warning only, don't block
            exit 0
        fi

        # Block writes during research phase (explorer agent should be read-only)
        if [ "$CURRENT_PHASE" = "research" ]; then
            echo "Phase gate: In 'research' phase - file modifications should wait." >&2
            echo "Tip: Complete research and move to design phase first." >&2
            # Warning only, don't block
            exit 0
        fi

        # Warn if writing during scope phase
        if [ "$CURRENT_PHASE" = "scope" ]; then
            echo "Phase gate: In 'scope' phase - ensure scope is defined before implementing." >&2
            exit 0
        fi

        # Require design doc before implementation
        if [ "$CURRENT_PHASE" = "implement" ]; then
            DESIGN_DOC=$(jq -r '.artifacts.design // empty' "$WORKFLOW_STATE" 2>/dev/null)
            if [ -z "$DESIGN_DOC" ]; then
                echo "Phase gate: No design document recorded in workflow state." >&2
                echo "Tip: Complete the design phase and record the artifact path." >&2
                # Warning only
                exit 0
            fi
            if [ ! -f "$DESIGN_DOC" ]; then
                echo "Phase gate: Design document not found at: $DESIGN_DOC" >&2
                echo "Tip: Ensure design document exists before implementing." >&2
                # Warning only
                exit 0
            fi
        fi

        # All checks passed
        exit 0
        ;;

    "check")
        # Display current phase status
        echo "Engineering Process Status"
        echo "=========================="
        echo "Story: $STORY"
        echo "Current Phase: $CURRENT_PHASE"
        echo "Completed: $COMPLETED_PHASES"

        # Show artifacts
        ARTIFACTS=$(jq -r '.artifacts // {} | to_entries[] | "  - \(.key): \(.value)"' "$WORKFLOW_STATE" 2>/dev/null)
        if [ -n "$ARTIFACTS" ]; then
            echo "Artifacts:"
            echo "$ARTIFACTS"
        fi

        exit 0
        ;;

    "validate")
        # Validate current phase completion
        echo "Validating phase: $CURRENT_PHASE"

        case "$CURRENT_PHASE" in
            "understand")
                echo "Understand phase validation:"
                echo "  - Requirements should be documented"
                echo "  - Ambiguities should be resolved"
                ;;
            "research")
                if [ -n "$(jq -r '.artifacts.research // empty' "$WORKFLOW_STATE" 2>/dev/null)" ]; then
                    echo "  [OK] Research notes artifact recorded"
                else
                    echo "  [WARN] No research notes artifact in workflow state"
                fi
                ;;
            "design")
                DESIGN=$(jq -r '.artifacts.design // empty' "$WORKFLOW_STATE" 2>/dev/null)
                if [ -n "$DESIGN" ] && [ -f "$DESIGN" ]; then
                    echo "  [OK] Design document exists: $DESIGN"
                else
                    echo "  [WARN] Design document missing or not recorded"
                fi
                ;;
            "implement")
                TASKS=$(jq -r '.artifacts.tasks // empty' "$WORKFLOW_STATE" 2>/dev/null)
                if [ -n "$TASKS" ] && [ -f "$TASKS" ]; then
                    echo "  [OK] Task breakdown exists: $TASKS"
                    # Check for incomplete tasks
                    INCOMPLETE=$(grep -c '^\- \[ \]' "$TASKS" 2>/dev/null || echo "0")
                    echo "  [INFO] Incomplete tasks: $INCOMPLETE"
                else
                    echo "  [WARN] Task breakdown missing"
                fi
                ;;
            "validate")
                echo "  - Ensure code review is complete"
                echo "  - Ensure all tests pass"
                ;;
            "deploy")
                echo "  - Ensure deployment is successful"
                echo "  - Ensure monitoring is in place"
                ;;
        esac

        exit 0
        ;;

    *)
        echo "Unknown action: $ACTION" >&2
        echo "Usage: phase-gate.sh [pre-write|check|validate]" >&2
        exit 1
        ;;
esac
