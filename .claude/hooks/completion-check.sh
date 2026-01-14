#!/bin/bash
#
# Completion Check Script
# Validates workflow completion before allowing Claude to stop
#
# This hook runs on the Stop event and can:
# - Warn about incomplete phases
# - Remind about missing artifacts
# - Block stopping if critical items are missing
#

set -e

STORIES_DIR="docs/stories"

# Find the most recently modified story's workflow state
find_workflow_state() {
    if [ -d "$STORIES_DIR" ]; then
        local latest
        latest=$(find "$STORIES_DIR" -name "workflow-state.json" -type f 2>/dev/null | \
            xargs ls -t 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            echo "$latest"
            return
        fi
    fi
    echo ""
}

WORKFLOW_STATE=$(find_workflow_state)

# Read hook input from stdin
if [ -t 0 ]; then
    INPUT=""
else
    INPUT=$(cat)
fi

# If no workflow state, allow stop without warnings
if [ -z "$WORKFLOW_STATE" ] || [ ! -f "$WORKFLOW_STATE" ]; then
    exit 0
fi

# Parse workflow state
CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$WORKFLOW_STATE" 2>/dev/null || echo "unknown")
COMPLETED_PHASES=$(jq -r '.completedPhases // []' "$WORKFLOW_STATE" 2>/dev/null || echo "[]")
STORY=$(jq -r '.story // "unknown"' "$WORKFLOW_STATE" 2>/dev/null || echo "unknown")

# If workflow is complete, allow stop
if [ "$CURRENT_PHASE" = "complete" ]; then
    exit 0
fi

# Backpressure enforcement (per WIGGUM.md: "downstream backpressure catches errors early")
# Set COMPLETION_CHECK_WARN_ONLY=1 to disable blocking
WARN_ONLY="${COMPLETION_CHECK_WARN_ONLY:-0}"

# Determine blocking behavior based on phase
# Early phases (understand, research) BLOCK - these are requirements/research gates
# Later phases (implement, validate) WARN - allow resuming work
SHOULD_BLOCK=false
WARNING=""

case "$CURRENT_PHASE" in
    "understand")
        WARNING="Workflow is in 'understand' phase. Requirements are not captured yet."
        SHOULD_BLOCK=true
        ;;
    "research")
        WARNING="Workflow is in 'research' phase. Codebase exploration incomplete."
        SHOULD_BLOCK=true
        ;;
    "scope")
        WARNING="Workflow is in 'scope' phase. Boundaries not yet defined."
        SHOULD_BLOCK=true
        ;;
    "design")
        WARNING="Workflow is in 'design' phase. Solution design incomplete."
        # Allow stopping after design starts - user may need to pause
        SHOULD_BLOCK=false
        ;;
    "decompose")
        WARNING="Workflow is in 'decompose' phase. Task breakdown incomplete."
        SHOULD_BLOCK=false
        ;;
    "implement")
        WARNING="Workflow is in 'implement' phase. Implementation incomplete."
        SHOULD_BLOCK=false
        ;;
    "validate")
        WARNING="Workflow is in 'validate' phase. Validation incomplete."
        SHOULD_BLOCK=false
        ;;
    *)
        WARNING="Workflow is in '$CURRENT_PHASE' phase."
        SHOULD_BLOCK=false
        ;;
esac

# Extract story slug from workflow state path
STORY_SLUG=$(dirname "$WORKFLOW_STATE" | xargs basename)

# Apply warn-only override if set
if [ "$WARN_ONLY" = "1" ]; then
    SHOULD_BLOCK=false
fi

# Output JSON response
if [ "$SHOULD_BLOCK" = true ]; then
    # Block stopping - backpressure enforcement
    cat << EOF
{
  "continue": false,
  "reason": "Engineering Process [$STORY_SLUG]: $WARNING Complete this phase or use COMPLETION_CHECK_WARN_ONLY=1 to override."
}
EOF
    exit 2
else
    # Allow with warning
    cat << EOF
{
  "continue": true,
  "systemMessage": "Engineering Process [$STORY_SLUG]: $WARNING Use /engineering-process:checkpoint to verify status."
}
EOF
    exit 0
fi
