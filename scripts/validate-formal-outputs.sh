#!/bin/bash
#
# validate-formal-outputs.sh
#
# Validates that formal verification JSON outputs conform to their schemas.
# Uses jq for basic structure validation.
#
# Usage: validate-formal-outputs.sh <story-slug> [--strict]
#
# Exit codes:
#   0 - All outputs valid
#   1 - Validation warnings
#   2 - Validation errors
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

STORY_SLUG="${1:-}"
STRICT_MODE="${2:-}"

if [[ -z "$STORY_SLUG" ]]; then
    echo "Usage: validate-formal-outputs.sh <story-slug> [--strict]"
    exit 1
fi

STORY_DIR="docs/stories/$STORY_SLUG"

if [[ ! -d "$STORY_DIR" ]]; then
    echo -e "${RED}ERROR: Story directory not found: $STORY_DIR${NC}"
    exit 2
fi

ERRORS=0
WARNINGS=0

echo "======================================"
echo "Formal Output Validation"
echo "Story: $STORY_SLUG"
echo "======================================"
echo ""

# Validate constraint-analysis.json
echo -e "${BLUE}Checking constraint-analysis.json...${NC}"
if [ -f "$STORY_DIR/constraint-analysis.json" ]; then

    # Check required field: constraints
    if ! jq -e '.constraints' "$STORY_DIR/constraint-analysis.json" >/dev/null 2>&1; then
        echo -e "${RED}  FAIL: Missing 'constraints' array${NC}"
        ((ERRORS++))
    else
        CONSTRAINT_COUNT=$(jq '.constraints | length' "$STORY_DIR/constraint-analysis.json")
        echo -e "${GREEN}  PASS: constraints array ($CONSTRAINT_COUNT items)${NC}"
    fi

    # Check required field: satisfiability
    if ! jq -e '.satisfiability' "$STORY_DIR/constraint-analysis.json" >/dev/null 2>&1; then
        echo -e "${RED}  FAIL: Missing 'satisfiability' field${NC}"
        ((ERRORS++))
    else
        SAT=$(jq -r '.satisfiability' "$STORY_DIR/constraint-analysis.json")
        if [[ ! "$SAT" =~ ^(SAT|UNSAT|UNKNOWN)$ ]]; then
            echo -e "${RED}  FAIL: Invalid satisfiability value: $SAT (expected SAT|UNSAT|UNKNOWN)${NC}"
            ((ERRORS++))
        else
            echo -e "${GREEN}  PASS: satisfiability = $SAT${NC}"
        fi
    fi

    # Check constraint IDs follow pattern
    INVALID_IDS=$(jq -r '.constraints[].id // "missing"' "$STORY_DIR/constraint-analysis.json" 2>/dev/null | grep -v "^C[0-9]" | head -1 || echo "")
    if [ -n "$INVALID_IDS" ]; then
        echo -e "${YELLOW}  WARN: Some constraint IDs don't match pattern C[0-9]+${NC}"
        ((WARNINGS++))
    fi

    # If UNSAT, check for unsat_core
    if [ "$SAT" = "UNSAT" ]; then
        if ! jq -e '.unsat_core' "$STORY_DIR/constraint-analysis.json" >/dev/null 2>&1; then
            echo -e "${YELLOW}  WARN: UNSAT but no unsat_core provided${NC}"
            ((WARNINGS++))
        fi
    fi
else
    echo -e "${YELLOW}  SKIP: constraint-analysis.json not found${NC}"
fi

echo ""

# Validate ltl-verification.json
echo -e "${BLUE}Checking ltl-verification.json...${NC}"
if [ -f "$STORY_DIR/ltl-verification.json" ]; then

    # Check required field: states
    if ! jq -e '.states' "$STORY_DIR/ltl-verification.json" >/dev/null 2>&1; then
        echo -e "${RED}  FAIL: Missing 'states' array${NC}"
        ((ERRORS++))
    else
        STATE_COUNT=$(jq '.states | length' "$STORY_DIR/ltl-verification.json")
        echo -e "${GREEN}  PASS: states array ($STATE_COUNT states)${NC}"
    fi

    # Check required field: transitions
    if ! jq -e '.transitions' "$STORY_DIR/ltl-verification.json" >/dev/null 2>&1; then
        echo -e "${RED}  FAIL: Missing 'transitions' array${NC}"
        ((ERRORS++))
    else
        TRANS_COUNT=$(jq '.transitions | length' "$STORY_DIR/ltl-verification.json")
        echo -e "${GREEN}  PASS: transitions array ($TRANS_COUNT transitions)${NC}"
    fi

    # Check required field: verification_result
    if ! jq -e '.verification_result' "$STORY_DIR/ltl-verification.json" >/dev/null 2>&1; then
        echo -e "${RED}  FAIL: Missing 'verification_result'${NC}"
        ((ERRORS++))
    else
        ALL_PASS=$(jq -r '.verification_result.all_pass' "$STORY_DIR/ltl-verification.json")
        DEADLOCKS=$(jq '.verification_result.deadlocks | length' "$STORY_DIR/ltl-verification.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}  PASS: verification_result.all_pass = $ALL_PASS${NC}"
        if [ "$DEADLOCKS" -gt 0 ]; then
            echo -e "${YELLOW}  WARN: $DEADLOCKS deadlock(s) detected${NC}"
            ((WARNINGS++))
        fi
    fi
else
    echo -e "${YELLOW}  SKIP: ltl-verification.json not found (OK if not a workflow feature)${NC}"
fi

echo ""

# Validate adversarial-cases.md or adversarial-scenarios.json
echo -e "${BLUE}Checking adversarial testing output...${NC}"
if [ -f "$STORY_DIR/adversarial-scenarios.json" ]; then
    SCENARIO_COUNT=$(jq '.generated_scenarios | length' "$STORY_DIR/adversarial-scenarios.json" 2>/dev/null || echo "0")
    if [ "$SCENARIO_COUNT" -lt 3 ]; then
        echo -e "${RED}  FAIL: Fewer than 3 scenarios in JSON (found: $SCENARIO_COUNT)${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}  PASS: $SCENARIO_COUNT adversarial scenarios in JSON${NC}"
    fi
elif [ -f "$STORY_DIR/adversarial-cases.md" ]; then
    CASE_COUNT=$(grep -cE "^### Case|^### ADV-" "$STORY_DIR/adversarial-cases.md" 2>/dev/null || echo "0")
    if [ "$CASE_COUNT" -lt 3 ]; then
        echo -e "${RED}  FAIL: Fewer than 3 cases in markdown (found: $CASE_COUNT)${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}  PASS: $CASE_COUNT adversarial cases in markdown${NC}"
    fi
else
    echo -e "${RED}  FAIL: No adversarial testing output found${NC}"
    ((ERRORS++))
fi

echo ""

# Validate preference-check.json
echo -e "${BLUE}Checking preference-check.json...${NC}"
if [ -f "$STORY_DIR/preference-check.json" ]; then
    HARD_CONFLICTS=$(jq '[.preference_conflicts[]? | select(.conflicts_with.severity == "hard")] | length' "$STORY_DIR/preference-check.json" 2>/dev/null || echo "0")
    SOFT_CONFLICTS=$(jq '[.preference_conflicts[]? | select(.conflicts_with.severity != "hard")] | length' "$STORY_DIR/preference-check.json" 2>/dev/null || echo "0")
    ALIGNMENTS=$(jq '.preference_alignments | length' "$STORY_DIR/preference-check.json" 2>/dev/null || echo "0")

    echo -e "${GREEN}  PASS: preference-check.json exists${NC}"
    echo "    Hard conflicts: $HARD_CONFLICTS"
    echo "    Soft conflicts: $SOFT_CONFLICTS"
    echo "    Alignments: $ALIGNMENTS"

    if [ "$HARD_CONFLICTS" -gt 0 ]; then
        echo -e "${RED}  FAIL: $HARD_CONFLICTS hard conflicts must be resolved${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}  SKIP: preference-check.json not found${NC}"
fi

echo ""

# Summary
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}VALIDATION FAILED${NC}"
    exit 2
elif [ $WARNINGS -gt 0 ] && [ "$STRICT_MODE" = "--strict" ]; then
    echo -e "${YELLOW}VALIDATION FAILED (strict mode)${NC}"
    exit 1
else
    echo -e "${GREEN}VALIDATION PASSED${NC}"
    exit 0
fi
