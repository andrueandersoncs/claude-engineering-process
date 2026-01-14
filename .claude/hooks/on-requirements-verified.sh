#!/bin/bash
#
# SubagentStop Handler: Requirements Verifier
#
# This script runs automatically when the requirements-verifier subagent finishes.
# It enforces that requirements verification actually completed and passed.
#
# Per Claude Code docs (SUBAGENTS.md):
#   "SubagentStop hooks run when subagent tasks complete"
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORIES_DIR="docs/stories"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${BLUE}REQUIREMENTS VERIFIER STOP HOOK${NC}                              ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Find active story
find_active_story() {
    if [ -d "$STORIES_DIR" ]; then
        local latest
        latest=$(find "$STORIES_DIR" -name "workflow-state.json" -type f 2>/dev/null | \
            xargs ls -t 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            dirname "$latest" | xargs basename
            return
        fi
    fi
    echo ""
}

STORY_SLUG=$(find_active_story)

if [ -z "$STORY_SLUG" ]; then
    echo -e "${YELLOW}No active story found - skipping enforcement${NC}"
    exit 0
fi

echo "Story: $STORY_SLUG"
echo ""

# Run verification scripts to confirm requirements are clean
VERIFICATION_STATUS="PASSED"
CONTRADICTION_STATUS="PASSED"

# Check requirements
echo -e "${YELLOW}Verifying requirements...${NC}"
if [ -x "$SCRIPT_DIR/verify-requirements.sh" ]; then
    if "$SCRIPT_DIR/verify-requirements.sh" "$STORY_SLUG" 2>&1; then
        echo -e "${GREEN}✓ Requirements verification passed${NC}"
    else
        VERIFICATION_STATUS="FAILED"
        echo -e "${RED}✗ Requirements verification failed${NC}"
    fi
else
    echo -e "${YELLOW}⊘ verify-requirements.sh not found${NC}"
fi

echo ""

# Check contradictions
echo -e "${YELLOW}Checking for contradictions...${NC}"
if [ -x "$SCRIPT_DIR/detect-contradictions.sh" ]; then
    if "$SCRIPT_DIR/detect-contradictions.sh" "$STORY_SLUG" 2>&1; then
        echo -e "${GREEN}✓ No contradictions detected${NC}"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 2 ]; then
            CONTRADICTION_STATUS="CRITICAL"
            echo -e "${RED}✗ Critical contradictions found${NC}"
        else
            CONTRADICTION_STATUS="WARNINGS"
            echo -e "${YELLOW}⚠ Potential contradictions found (review recommended)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⊘ detect-contradictions.sh not found${NC}"
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Determine overall status
OVERALL_STATUS="PASSED"
if [ "$VERIFICATION_STATUS" = "FAILED" ] || [ "$CONTRADICTION_STATUS" = "CRITICAL" ]; then
    OVERALL_STATUS="FAILED"
elif [ "$CONTRADICTION_STATUS" = "WARNINGS" ]; then
    OVERALL_STATUS="WARNINGS"
fi

echo "Requirements Verification Summary:"
echo "  Requirements:    $VERIFICATION_STATUS"
echo "  Contradictions:  $CONTRADICTION_STATUS"
echo "  Overall:         $OVERALL_STATUS"
echo ""

cat << EOF
{
  "status": "$OVERALL_STATUS",
  "story": "$STORY_SLUG",
  "requirementsVerification": "$VERIFICATION_STATUS",
  "contradictionCheck": "$CONTRADICTION_STATUS",
  "message": "Requirements verification completed with status: $OVERALL_STATUS"
}
EOF

if [ "$OVERALL_STATUS" = "FAILED" ]; then
    echo ""
    echo -e "${RED}Requirements verification failed.${NC}"
    echo -e "Resolve all issues before proceeding to research phase."
fi

exit 0
