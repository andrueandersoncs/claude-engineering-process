#!/bin/bash
#
# on-adversary-complete.sh
#
# Hook that runs after adversary agent completes. Validates that:
# 1. adversarial-cases.md exists
# 2. At least 3 adversarial cases were generated
# 3. Each case has a category and resolution status
#
# Exit codes:
#   0 - Adversarial testing validation passed
#   1 - Incomplete adversarial testing (warning)
#   2 - Adversarial testing failed (blocking)
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find active story
STORIES_DIR="docs/stories"
STORY_SLUG=""

if [[ -d "$STORIES_DIR" ]]; then
    # Find most recently modified workflow-state.json
    STORY_SLUG=$(find "$STORIES_DIR" -name "workflow-state.json" -type f -exec stat -f '%m %N' {} \; 2>/dev/null | sort -rn | head -1 | awk '{print $2}' | xargs dirname 2>/dev/null | xargs basename 2>/dev/null || echo "")

    # Fallback for Linux stat format
    if [[ -z "$STORY_SLUG" ]]; then
        STORY_SLUG=$(find "$STORIES_DIR" -name "workflow-state.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}' | xargs dirname 2>/dev/null | xargs basename 2>/dev/null || echo "")
    fi
fi

if [[ -z "$STORY_SLUG" ]]; then
    echo -e "${YELLOW}WARN: No active story found, skipping adversary validation${NC}"
    exit 0
fi

STORY_DIR="$STORIES_DIR/$STORY_SLUG"
ADVERSARIAL_FILE="$STORY_DIR/adversarial-cases.md"

echo "======================================"
echo "Adversarial Testing Validation"
echo "Story: $STORY_SLUG"
echo "======================================"
echo ""

# Check 1: File exists
if [[ ! -f "$ADVERSARIAL_FILE" ]]; then
    echo -e "${RED}FAIL: adversarial-cases.md not found${NC}"
    echo "The adversary agent must create this file."
    exit 2
fi
echo -e "${GREEN}PASS: adversarial-cases.md exists${NC}"

# Check 2: Count cases (look for ### Case or ADV- patterns)
CASE_COUNT=$(grep -cE "^### Case|^### ADV-|^\*\*id\*\*: \"ADV-" "$ADVERSARIAL_FILE" 2>/dev/null || echo "0")
if [[ "$CASE_COUNT" -lt 3 ]]; then
    echo -e "${RED}FAIL: Only $CASE_COUNT adversarial cases found (minimum: 3)${NC}"
    echo "The adversary agent must generate at least 3 adversarial test cases."
    exit 2
fi
echo -e "${GREEN}PASS: $CASE_COUNT adversarial cases generated${NC}"

# Check 3: Look for unresolved/missed cases without recommendations
if grep -qE "\- \[ \] Missed|\*\*Actual Result\*\*:.*Missed" "$ADVERSARIAL_FILE" 2>/dev/null; then
    MISSED_COUNT=$(grep -cE "\- \[ \] Missed|\*\*Actual Result\*\*:.*Missed" "$ADVERSARIAL_FILE" 2>/dev/null || echo "0")
    if grep -qi "Recommendation\|recommendation\|Resolution\|resolution" "$ADVERSARIAL_FILE" 2>/dev/null; then
        echo -e "${YELLOW}WARN: $MISSED_COUNT cases missed but recommendations documented${NC}"
    else
        echo -e "${RED}FAIL: $MISSED_COUNT cases missed without recommendations${NC}"
        echo "Document how to handle missed adversarial cases."
        exit 1
    fi
else
    echo -e "${GREEN}PASS: All cases either caught or documented${NC}"
fi

# Check 4: Summary section exists
if grep -qE "^## Summary|^## Gap Analysis" "$ADVERSARIAL_FILE" 2>/dev/null; then
    echo -e "${GREEN}PASS: Summary/analysis section present${NC}"
else
    echo -e "${YELLOW}WARN: No summary section found${NC}"
fi

# Check 5: Categories are assigned
UNCATEGORIZED=$(grep -cE "^\*\*Category\*\*:.*\?\?\?|\*\*category\*\*:.*null" "$ADVERSARIAL_FILE" 2>/dev/null || echo "0")
if [[ "$UNCATEGORIZED" -gt 0 ]]; then
    echo -e "${YELLOW}WARN: $UNCATEGORIZED cases have no category assigned${NC}"
fi

echo ""
echo -e "${GREEN}Adversarial testing validation PASSED${NC}"
exit 0
