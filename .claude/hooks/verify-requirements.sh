#!/usr/bin/env bash
#
# verify-requirements.sh
#
# Verify that requirements have been properly documented and verified
# before allowing implementation to proceed.
#
# Usage: verify-requirements.sh <story-slug>
#
# Exit codes:
#   0 - Requirements verified
#   1 - Requirements incomplete or missing
#   2 - Blocked - critical issues found
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get story slug from argument or find active story
STORY_SLUG="${1:-}"

if [[ -z "$STORY_SLUG" ]]; then
    # Try to find active story from workflow state
    STORIES_DIR="docs/stories"
    if [[ -d "$STORIES_DIR" ]]; then
        # Find the most recently modified workflow-state.json
        ACTIVE_STORY=$(find "$STORIES_DIR" -name "workflow-state.json" -type f -exec stat -f '%m %N' {} \; 2>/dev/null | sort -rn | head -1 | awk '{print $2}' | xargs dirname | xargs basename)
        if [[ -n "$ACTIVE_STORY" ]]; then
            STORY_SLUG="$ACTIVE_STORY"
        fi
    fi
fi

if [[ -z "$STORY_SLUG" ]]; then
    echo -e "${RED}ERROR: No story slug provided and no active story found${NC}"
    echo "Usage: verify-requirements.sh <story-slug>"
    exit 1
fi

STORY_DIR="docs/stories/$STORY_SLUG"

echo "======================================"
echo "Requirements Verification"
echo "Story: $STORY_SLUG"
echo "======================================"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Workflow state exists
echo "Checking workflow state..."
if [[ ! -f "$STORY_DIR/workflow-state.json" ]]; then
    echo -e "${RED}FAIL: workflow-state.json not found${NC}"
    exit 1
fi
echo -e "${GREEN}PASS: workflow-state.json exists${NC}"

# Check 2: Verify current phase
CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$STORY_DIR/workflow-state.json" 2>/dev/null || echo "unknown")
echo "Current phase: $CURRENT_PHASE"

# Check 3: Look for acceptance criteria
echo ""
echo "Checking acceptance criteria..."
if [[ -f "$STORY_DIR/workflow-state.json" ]]; then
    # Check if acceptance criteria are documented
    if jq -e '.acceptanceCriteria' "$STORY_DIR/workflow-state.json" >/dev/null 2>&1; then
        CRITERIA_COUNT=$(jq '.acceptanceCriteria | length' "$STORY_DIR/workflow-state.json")
        if [[ "$CRITERIA_COUNT" -gt 0 ]]; then
            echo -e "${GREEN}PASS: $CRITERIA_COUNT acceptance criteria found${NC}"
        else
            echo -e "${YELLOW}WARN: Acceptance criteria array is empty${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}WARN: No acceptanceCriteria field in workflow state${NC}"
        ((WARNINGS++))
    fi
fi

# Check 4: Look for unresolved questions
echo ""
echo "Checking for unresolved questions..."
if grep -r "???" "$STORY_DIR"/*.md 2>/dev/null; then
    echo -e "${RED}FAIL: Found unresolved questions (???) in documentation${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}PASS: No unresolved questions found${NC}"
fi

# Check 5: Check for UNRESOLVED markers
echo ""
echo "Checking for UNRESOLVED markers..."
if grep -ri "UNRESOLVED" "$STORY_DIR"/*.md 2>/dev/null; then
    echo -e "${RED}FAIL: Found UNRESOLVED markers in documentation${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}PASS: No UNRESOLVED markers found${NC}"
fi

# Check 6: Check for BLOCKED markers
echo ""
echo "Checking for BLOCKED markers..."
if grep -ri "BLOCKED" "$STORY_DIR"/*.md 2>/dev/null; then
    echo -e "${RED}BLOCKED: Found BLOCKED markers in documentation${NC}"
    exit 2
else
    echo -e "${GREEN}PASS: No BLOCKED markers found${NC}"
fi

# Check 7: Check for contradiction markers
echo ""
echo "Checking for unresolved contradictions..."
if grep -ri "CONTRADICTION" "$STORY_DIR"/*.md 2>/dev/null | grep -v "RESOLVED"; then
    echo -e "${YELLOW}WARN: Found CONTRADICTION markers - verify they are resolved${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}PASS: No unresolved contradictions found${NC}"
fi

# Check 8: Look for TODO items in requirements
echo ""
echo "Checking for TODO items..."
if grep -ri "TODO" "$STORY_DIR"/*.md 2>/dev/null | grep -vi "completed"; then
    echo -e "${YELLOW}WARN: Found TODO items in documentation${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}PASS: No pending TODO items found${NC}"
fi

# Summary
echo ""
echo "======================================"
echo "Verification Summary"
echo "======================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [[ $ERRORS -gt 0 ]]; then
    echo ""
    echo -e "${RED}VERIFICATION FAILED${NC}"
    echo "Requirements have critical issues that must be resolved."
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}VERIFICATION PASSED WITH WARNINGS${NC}"
    echo "Requirements are acceptable but have minor issues."
    exit 0
else
    echo ""
    echo -e "${GREEN}VERIFICATION PASSED${NC}"
    echo "Requirements are properly documented and verified."
    exit 0
fi
