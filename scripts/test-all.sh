#!/usr/bin/env bash
#
# test-all.sh
#
# Master test runner that executes all test suites for the engineering-process plugin.
#
# Usage: ./test-all.sh [--verbose] [--unit-only] [--integration-only]
#
# Options:
#   --verbose          Show detailed output
#   --unit-only        Run only unit tests
#   --integration-only Run only integration tests
#
# Exit codes:
#   0 - All tests pass
#   1 - Some tests failed
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERBOSE=""
RUN_UNIT=true
RUN_INTEGRATION=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE="--verbose"
            shift
            ;;
        --unit-only)
            RUN_INTEGRATION=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            shift
            ;;
        --help|-h)
            echo "Usage: ./test-all.sh [--verbose] [--unit-only] [--integration-only]"
            echo ""
            echo "Options:"
            echo "  --verbose          Show detailed output"
            echo "  --unit-only        Run only unit tests"
            echo "  --integration-only Run only integration tests"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${BLUE}ENGINEERING-PROCESS TEST SUITE${NC}                                              ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#
# Unit Tests
#

if [[ "$RUN_UNIT" == "true" ]]; then
    echo -e "${BOLD}Running Unit Tests...${NC}"
    echo ""

    UNIT_OUTPUT=$("$SCRIPT_DIR/test-verification-scripts.sh" 2>&1) || true
    echo "$UNIT_OUTPUT"

    # Parse summary - strip ANSI codes first, then extract numbers
    # ANSI codes are like \033[...m or \e[...m
    UNIT_CLEAN=$(echo "$UNIT_OUTPUT" | sed $'s/\033\\[[0-9;]*m//g')
    UNIT_PASSED=$(echo "$UNIT_CLEAN" | grep "^Passed:" | awk '{print $2}' || echo "0")
    UNIT_FAILED=$(echo "$UNIT_CLEAN" | grep "^Failed:" | awk '{print $2}' || echo "0")

    # Handle empty values
    [[ -z "$UNIT_PASSED" ]] && UNIT_PASSED=0
    [[ -z "$UNIT_FAILED" ]] && UNIT_FAILED=0

    TOTAL_PASSED=$((TOTAL_PASSED + UNIT_PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + UNIT_FAILED))

    echo ""
fi

#
# Integration Tests
#

if [[ "$RUN_INTEGRATION" == "true" ]]; then
    echo -e "${BOLD}Running Integration Tests...${NC}"
    echo ""

    INTEGRATION_OUTPUT=$("$SCRIPT_DIR/test-integration-scripts.sh" $VERBOSE 2>&1) || true
    echo "$INTEGRATION_OUTPUT"

    # Parse summary - strip ANSI codes first, then extract numbers
    INT_CLEAN=$(echo "$INTEGRATION_OUTPUT" | sed $'s/\033\\[[0-9;]*m//g')
    INT_PASSED=$(echo "$INT_CLEAN" | grep "^Passed:" | awk '{print $2}' || echo "0")
    INT_FAILED=$(echo "$INT_CLEAN" | grep "^Failed:" | awk '{print $2}' || echo "0")
    INT_SKIPPED=$(echo "$INT_CLEAN" | grep "^Skipped:" | awk '{print $2}' || echo "0")

    # Handle empty values
    [[ -z "$INT_PASSED" ]] && INT_PASSED=0
    [[ -z "$INT_FAILED" ]] && INT_FAILED=0
    [[ -z "$INT_SKIPPED" ]] && INT_SKIPPED=0

    TOTAL_PASSED=$((TOTAL_PASSED + INT_PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + INT_FAILED))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + INT_SKIPPED))

    echo ""
fi

#
# Final Summary
#

echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${BLUE}COMBINED TEST RESULTS${NC}                                                       ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}    Total Passed:  ${GREEN}$TOTAL_PASSED${NC}                                                        ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}    Total Failed:  ${RED}$TOTAL_FAILED${NC}                                                         ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}    Total Skipped: ${YELLOW}$TOTAL_SKIPPED${NC}                                                         ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"

if [[ $TOTAL_FAILED -gt 0 ]]; then
    echo -e "${BOLD}║${NC}    ${RED}SOME TESTS FAILED${NC}                                                        ${BOLD}║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
else
    echo -e "${BOLD}║${NC}    ${GREEN}ALL TESTS PASSED${NC}                                                          ${BOLD}║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
fi
