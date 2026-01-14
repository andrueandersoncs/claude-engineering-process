#!/bin/bash
#
# SubagentStop Handler: Implementer
#
# This script runs automatically when the implementer subagent finishes.
# It enforces validation by running the full test suite.
#
# Per Claude Code docs (SUBAGENTS.md):
#   "SubagentStop hooks run when subagent tasks complete"
#
# This ensures validation ALWAYS runs after implementation,
# rather than relying on the agent to choose to run it.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${BLUE}IMPLEMENTER STOP HOOK${NC} - Enforced Validation                 ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Run full validation suite
echo -e "${YELLOW}Running enforced validation after implementation...${NC}"
echo ""

VALIDATION_FAILED=0

# Run the validation script
if [ -x "$SCRIPT_DIR/run-validation.sh" ]; then
    if "$SCRIPT_DIR/run-validation.sh"; then
        echo ""
        echo -e "${GREEN}✓ Validation PASSED${NC}"
    else
        echo ""
        echo -e "${RED}✗ Validation FAILED${NC}"
        VALIDATION_FAILED=1
    fi
else
    echo -e "${YELLOW}⚠ run-validation.sh not found or not executable${NC}"
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo -e "${RED}Implementation completed but validation failed.${NC}"
    echo -e "${YELLOW}The implementer should fix the issues before proceeding.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the validation failures above"
    echo "  2. Fix the failing tests or linting errors"
    echo "  3. Re-run validation with: ./scripts/run-validation.sh"
    echo ""
    # Return validation results to Claude via stdout
    cat << EOF
{
  "status": "VALIDATION_FAILED",
  "message": "Implementation completed but validation failed. Fix the issues before proceeding to validate phase.",
  "action_required": true
}
EOF
else
    echo -e "${GREEN}Implementation and validation both succeeded.${NC}"
    echo -e "Ready to proceed to the ${BOLD}validate${NC} phase."
    echo ""
    cat << EOF
{
  "status": "VALIDATION_PASSED",
  "message": "Implementation and validation succeeded. Ready for validate phase.",
  "action_required": false
}
EOF
fi

# Always exit 0 - we report status but don't block
# (The phase transition hook will block if they try to advance with failed validation)
exit 0
