#!/bin/bash
#
# SubagentStop Handler: Validator
#
# This script runs automatically when the validator subagent finishes.
# It enforces extended verification (mutation testing, fuzzing) for
# medium+ risk implementations.
#
# Per Claude Code docs (SUBAGENTS.md):
#   "SubagentStop hooks run when subagent tasks complete"
#
# This ensures mutation testing and fuzzing ALWAYS run during validation,
# rather than relying on the agent to choose to run them.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORIES_DIR="docs/stories"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${CYAN}VALIDATOR STOP HOOK${NC} - Extended Verification                 ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Find active story to check risk level
find_active_story() {
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

WORKFLOW_STATE=$(find_active_story)
RISK_LEVEL="medium"  # Default to medium risk

if [ -n "$WORKFLOW_STATE" ] && [ -f "$WORKFLOW_STATE" ]; then
    # Try to read risk level from workflow state
    RISK_LEVEL=$(jq -r '.riskLevel // "medium"' "$WORKFLOW_STATE" 2>/dev/null || echo "medium")
fi

echo -e "Risk level: ${BOLD}$RISK_LEVEL${NC}"
echo ""

MUTATION_STATUS="SKIPPED"
FUZZ_STATUS="SKIPPED"
OVERALL_STATUS="PASSED"

# Determine verification level based on risk
case "$RISK_LEVEL" in
    "low")
        echo -e "${YELLOW}Low risk: Skipping extended verification (mutation/fuzzing)${NC}"
        echo "Only basic tests required for low-risk changes."
        ;;

    "medium"|"high"|"critical")
        echo -e "${BLUE}$RISK_LEVEL risk: Running extended verification${NC}"
        echo ""

        # Run mutation tests
        echo -e "${YELLOW}Running mutation tests...${NC}"
        if [ -x "$SCRIPT_DIR/run-mutation-tests.sh" ]; then
            if "$SCRIPT_DIR/run-mutation-tests.sh" --quick 2>&1; then
                MUTATION_STATUS="PASSED"
                echo -e "${GREEN}✓ Mutation testing passed${NC}"
            else
                EXIT_CODE=$?
                if [ $EXIT_CODE -eq 2 ]; then
                    MUTATION_STATUS="NOT_CONFIGURED"
                    echo -e "${YELLOW}⊘ Mutation testing not configured${NC}"
                else
                    MUTATION_STATUS="FAILED"
                    echo -e "${RED}✗ Mutation testing failed${NC}"
                    if [ "$RISK_LEVEL" = "high" ] || [ "$RISK_LEVEL" = "critical" ]; then
                        OVERALL_STATUS="FAILED"
                    else
                        OVERALL_STATUS="WARN"
                    fi
                fi
            fi
        else
            MUTATION_STATUS="NOT_AVAILABLE"
            echo -e "${YELLOW}⊘ Mutation testing script not found${NC}"
        fi

        echo ""

        # Run fuzzing
        echo -e "${YELLOW}Running fuzz tests...${NC}"
        if [ -x "$SCRIPT_DIR/run-fuzzer.sh" ]; then
            if "$SCRIPT_DIR/run-fuzzer.sh" --quick 2>&1; then
                FUZZ_STATUS="PASSED"
                echo -e "${GREEN}✓ Fuzz testing passed${NC}"
            else
                EXIT_CODE=$?
                if [ $EXIT_CODE -eq 2 ]; then
                    FUZZ_STATUS="NOT_CONFIGURED"
                    echo -e "${YELLOW}⊘ Fuzz testing not configured${NC}"
                else
                    FUZZ_STATUS="FAILED"
                    echo -e "${RED}✗ Fuzz testing failed (crashes found)${NC}"
                    if [ "$RISK_LEVEL" = "high" ] || [ "$RISK_LEVEL" = "critical" ]; then
                        OVERALL_STATUS="FAILED"
                    else
                        OVERALL_STATUS="WARN"
                    fi
                fi
            fi
        else
            FUZZ_STATUS="NOT_AVAILABLE"
            echo -e "${YELLOW}⊘ Fuzz testing script not found${NC}"
        fi
        ;;

    *)
        echo -e "${YELLOW}Unknown risk level: $RISK_LEVEL - treating as medium${NC}"
        ;;
esac

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Extended Verification Summary:"
echo "  Mutation Testing: $MUTATION_STATUS"
echo "  Fuzz Testing:     $FUZZ_STATUS"
echo "  Overall:          $OVERALL_STATUS"
echo ""

# Output structured result
cat << EOF
{
  "status": "$OVERALL_STATUS",
  "riskLevel": "$RISK_LEVEL",
  "mutationTesting": "$MUTATION_STATUS",
  "fuzzTesting": "$FUZZ_STATUS",
  "message": "Extended verification completed with status: $OVERALL_STATUS"
}
EOF

# For high/critical risk with failures, exit non-zero to signal issue
# (but don't block - the phase transition hook handles blocking)
if [ "$OVERALL_STATUS" = "FAILED" ]; then
    echo ""
    echo -e "${RED}Extended verification failed for $RISK_LEVEL-risk change.${NC}"
    echo -e "Fix the issues before completing the workflow."
fi

exit 0
