#!/usr/bin/env bash
#
# detect-contradictions.sh
#
# Detect potential contradictions between requirements and existing
# codebase constraints. This is a lightweight check that looks for
# common contradiction patterns.
#
# Usage: detect-contradictions.sh <story-slug>
#
# Exit codes:
#   0 - No contradictions detected
#   1 - Potential contradictions found (review needed)
#   2 - Critical contradictions found (blocking)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STORY_SLUG="${1:-}"

if [[ -z "$STORY_SLUG" ]]; then
    echo -e "${RED}ERROR: Story slug required${NC}"
    echo "Usage: detect-contradictions.sh <story-slug>"
    exit 1
fi

STORY_DIR="docs/stories/$STORY_SLUG"
CONTRADICTIONS=0
WARNINGS=0

echo "======================================"
echo "Contradiction Detection"
echo "Story: $STORY_SLUG"
echo "======================================"
echo ""

# Helper function to check if a pattern exists in the codebase
check_codebase() {
    local pattern="$1"
    local description="$2"

    if grep -r "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" . 2>/dev/null | head -5; then
        echo -e "${BLUE}Found: $description${NC}"
        return 0
    fi
    return 1
}

# Check for common contradiction patterns

echo "Checking for JavaScript-dependent features vs no-JS constraints..."
# Pattern: Requirement mentions AJAX/fetch but project might require no-JS
if [[ -f "$STORY_DIR/workflow-state.json" ]] || [[ -f "$STORY_DIR/research-notes.md" ]]; then
    # Check if requirements mention dynamic features
    if grep -qi "ajax\|fetch\|real-time\|websocket\|dynamic" "$STORY_DIR"/*.md 2>/dev/null; then
        # Check if there's a no-JS requirement
        if grep -qi "no.javascript\|without.javascript\|js.disabled\|noscript" . -r --include="*.md" --include="CLAUDE.md" 2>/dev/null; then
            echo -e "${YELLOW}POTENTIAL CONTRADICTION:${NC}"
            echo "  - Requirement mentions dynamic/JS features"
            echo "  - Codebase may have no-JavaScript constraints"
            ((WARNINGS++))
        fi
    fi
fi

echo ""
echo "Checking for authentication method conflicts..."
# Pattern: Different auth methods mentioned
if grep -qi "oauth\|jwt\|session\|password\|magic.link" "$STORY_DIR"/*.md 2>/dev/null; then
    AUTH_METHODS=$(grep -oiE "oauth|jwt|session|password|magic.link" "$STORY_DIR"/*.md 2>/dev/null | sort -u | wc -l)
    if [[ "$AUTH_METHODS" -gt 1 ]]; then
        echo -e "${YELLOW}NOTE: Multiple auth methods mentioned ($AUTH_METHODS types)${NC}"
        echo "  Verify these are compatible or clearly specify which to use."
    fi
fi

echo ""
echo "Checking for state management conflicts..."
# Pattern: Both mutable and immutable mentioned
if grep -qi "immutable" "$STORY_DIR"/*.md 2>/dev/null; then
    if grep -qi "edit\|update\|modify\|change" "$STORY_DIR"/*.md 2>/dev/null; then
        # Check context
        echo -e "${YELLOW}NOTE: Both 'immutable' and mutation verbs found${NC}"
        echo "  Verify immutability constraints don't conflict with edit requirements."
        ((WARNINGS++))
    fi
fi

echo ""
echo "Checking for timing conflicts..."
# Pattern: Both synchronous and async requirements
if grep -qi "immediate\|instant\|synchronous" "$STORY_DIR"/*.md 2>/dev/null; then
    if grep -qi "eventual\|async\|queue\|background" "$STORY_DIR"/*.md 2>/dev/null; then
        echo -e "${YELLOW}NOTE: Both immediate and eventual timing mentioned${NC}"
        echo "  Clarify which operations need which timing."
        ((WARNINGS++))
    fi
fi

echo ""
echo "Checking for scope conflicts..."
# Pattern: "All users" vs specific roles
if grep -qi "all.users\|every.user\|anyone" "$STORY_DIR"/*.md 2>/dev/null; then
    if grep -qi "admin.only\|authorized\|permission" "$STORY_DIR"/*.md 2>/dev/null; then
        echo -e "${YELLOW}NOTE: Both 'all users' and permission restrictions mentioned${NC}"
        echo "  Clarify exact access control requirements."
        ((WARNINGS++))
    fi
fi

echo ""
echo "Checking for infrastructure conflicts..."
# Check if requirements assume infrastructure that doesn't exist
if [[ -f "$STORY_DIR/research-notes.md" ]]; then
    # Check for Redis requirement without Redis in project
    if grep -qi "redis\|cache" "$STORY_DIR"/*.md 2>/dev/null; then
        if ! find . -name "*.yml" -o -name "*.yaml" -o -name "*.json" 2>/dev/null | xargs grep -qi "redis" 2>/dev/null; then
            echo -e "${YELLOW}NOTE: Redis/cache mentioned but may not be configured${NC}"
            ((WARNINGS++))
        fi
    fi

    # Check for queue requirement without queue in project
    if grep -qi "queue\|worker\|job" "$STORY_DIR"/*.md 2>/dev/null; then
        if ! find . -name "*.yml" -o -name "*.yaml" -o -name "*.json" 2>/dev/null | xargs grep -qi "queue\|bull\|rabbitmq\|sqs" 2>/dev/null; then
            echo -e "${YELLOW}NOTE: Queue/worker mentioned but may not be configured${NC}"
            ((WARNINGS++))
        fi
    fi
fi

echo ""
echo "Checking for explicit contradictions in documentation..."
# Look for contradiction markers
if grep -ri "contradict\|conflict\|incompatible" "$STORY_DIR"/*.md 2>/dev/null; then
    echo -e "${YELLOW}Found explicit contradiction discussion in documentation${NC}"
    ((WARNINGS++))
fi

# Check for explicit CONTRADICTION markers that aren't resolved
if grep -ri "CONTRADICTION:" "$STORY_DIR"/*.md 2>/dev/null | grep -v "RESOLVED"; then
    echo -e "${RED}CRITICAL: Unresolved CONTRADICTION markers found${NC}"
    ((CONTRADICTIONS++))
fi

# Summary
echo ""
echo "======================================"
echo "Detection Summary"
echo "======================================"
echo "Critical contradictions: $CONTRADICTIONS"
echo "Potential issues (warnings): $WARNINGS"

if [[ $CONTRADICTIONS -gt 0 ]]; then
    echo ""
    echo -e "${RED}CRITICAL CONTRADICTIONS DETECTED${NC}"
    echo "Resolve these before proceeding with implementation."
    exit 2
elif [[ $WARNINGS -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}POTENTIAL ISSUES DETECTED${NC}"
    echo "Review these items to ensure no contradictions exist."
    exit 1
else
    echo ""
    echo -e "${GREEN}NO CONTRADICTIONS DETECTED${NC}"
    exit 0
fi
