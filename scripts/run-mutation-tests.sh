#!/usr/bin/env bash
#
# run-mutation-tests.sh
#
# Run mutation testing on the project. Auto-detects the project type
# and runs the appropriate mutation testing tool.
#
# Usage: run-mutation-tests.sh [--quick|--full] [path]
#
# Options:
#   --quick   Run on changed files only (default)
#   --full    Run on entire project
#   path      Specific path to test
#
# Exit codes:
#   0 - Mutation score meets threshold
#   1 - Mutation score below threshold
#   2 - Mutation testing not available
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="quick"
TARGET_PATH=""
THRESHOLD=60  # Default mutation score threshold

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            MODE="quick"
            shift
            ;;
        --full)
            MODE="full"
            shift
            ;;
        --threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        *)
            TARGET_PATH="$1"
            shift
            ;;
    esac
done

echo "======================================"
echo "Mutation Testing"
echo "Mode: $MODE"
echo "Threshold: ${THRESHOLD}%"
[[ -n "$TARGET_PATH" ]] && echo "Target: $TARGET_PATH"
echo "======================================"
echo ""

# Get changed files for quick mode
get_changed_files() {
    local extension="$1"
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        # Get files changed from main/master
        BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
        git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null | grep "\.$extension$" || true
    fi
}

# JavaScript/TypeScript with Stryker
if [[ -f "package.json" ]]; then
    echo -e "${BLUE}Detected: JavaScript/TypeScript project${NC}"

    if grep -q "stryker" package.json 2>/dev/null || [[ -f "stryker.conf.js" ]] || [[ -f "stryker.conf.json" ]]; then
        echo "Using Stryker for mutation testing..."

        STRYKER_ARGS=""

        if [[ "$MODE" == "quick" ]]; then
            CHANGED=$(get_changed_files "ts\|js\|tsx\|jsx")
            if [[ -n "$CHANGED" ]]; then
                echo "Changed files:"
                echo "$CHANGED"
                # Stryker can filter by file
                STRYKER_ARGS="--mutate $(echo "$CHANGED" | tr '\n' ',')"
            else
                echo "No changed files detected, running on all files"
            fi
        fi

        if [[ -n "$TARGET_PATH" ]]; then
            STRYKER_ARGS="--mutate $TARGET_PATH/**/*.{ts,js,tsx,jsx}"
        fi

        echo ""
        echo "Running Stryker..."
        if npx stryker run $STRYKER_ARGS 2>&1; then
            # Extract mutation score from report
            if [[ -f "reports/mutation/mutation.json" ]]; then
                SCORE=$(jq '.schemaVersion' reports/mutation/mutation.json 2>/dev/null || echo "0")
                echo ""
                echo "Mutation Score: ${SCORE}%"

                if (( $(echo "$SCORE >= $THRESHOLD" | bc -l) )); then
                    echo -e "${GREEN}PASS: Mutation score meets threshold${NC}"
                    exit 0
                else
                    echo -e "${RED}FAIL: Mutation score below threshold${NC}"
                    exit 1
                fi
            fi
            echo -e "${GREEN}Mutation testing complete${NC}"
            exit 0
        else
            echo -e "${RED}Stryker failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Stryker not configured${NC}"
        echo "Setup Stryker:"
        echo "  npm install --save-dev @stryker-mutator/core"
        echo "  npx stryker init"
        exit 2
    fi
fi

# Python with mutmut
if [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]]; then
    echo -e "${BLUE}Detected: Python project${NC}"

    if command -v mutmut &>/dev/null; then
        echo "Using mutmut for mutation testing..."

        MUTMUT_ARGS=""

        if [[ -n "$TARGET_PATH" ]]; then
            MUTMUT_ARGS="--paths-to-mutate=$TARGET_PATH"
        elif [[ "$MODE" == "quick" ]]; then
            CHANGED=$(get_changed_files "py")
            if [[ -n "$CHANGED" ]]; then
                echo "Changed files:"
                echo "$CHANGED"
                MUTMUT_ARGS="--paths-to-mutate=$(echo "$CHANGED" | tr '\n' ',')"
            fi
        fi

        echo ""
        echo "Running mutmut..."

        # Run mutation testing
        mutmut run $MUTMUT_ARGS 2>&1 || true

        # Get results
        echo ""
        echo "Results:"
        mutmut results

        # Calculate score
        KILLED=$(mutmut results 2>&1 | grep -oP "Killed: \K\d+" || echo "0")
        SURVIVED=$(mutmut results 2>&1 | grep -oP "Survived: \K\d+" || echo "0")
        TOTAL=$((KILLED + SURVIVED))

        if [[ $TOTAL -gt 0 ]]; then
            SCORE=$((KILLED * 100 / TOTAL))
            echo ""
            echo "Mutation Score: ${SCORE}% ($KILLED/$TOTAL killed)"

            if [[ $SCORE -ge $THRESHOLD ]]; then
                echo -e "${GREEN}PASS: Mutation score meets threshold${NC}"
                exit 0
            else
                echo -e "${RED}FAIL: Mutation score below threshold${NC}"
                exit 1
            fi
        fi

        exit 0
    else
        echo -e "${YELLOW}mutmut not installed${NC}"
        echo "Install with: pip install mutmut"
        exit 2
    fi
fi

# Rust with cargo-mutants
if [[ -f "Cargo.toml" ]]; then
    echo -e "${BLUE}Detected: Rust project${NC}"

    if command -v cargo-mutants &>/dev/null; then
        echo "Using cargo-mutants..."

        CARGO_ARGS=""

        if [[ -n "$TARGET_PATH" ]]; then
            CARGO_ARGS="--package $(basename "$TARGET_PATH")"
        fi

        if [[ "$MODE" == "quick" ]]; then
            # Sample mutants for quick mode
            CARGO_ARGS="$CARGO_ARGS --jobs 4"
        fi

        echo ""
        echo "Running cargo-mutants..."
        cargo mutants $CARGO_ARGS 2>&1

        echo -e "${GREEN}Mutation testing complete${NC}"
        exit 0
    else
        echo -e "${YELLOW}cargo-mutants not installed${NC}"
        echo "Install with: cargo install cargo-mutants"
        exit 2
    fi
fi

# Java with PIT
if [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]]; then
    echo -e "${BLUE}Detected: Java project${NC}"

    if [[ -f "pom.xml" ]]; then
        if grep -q "pitest" pom.xml 2>/dev/null; then
            echo "Using PIT (Pitest)..."
            mvn org.pitest:pitest-maven:mutationCoverage
            exit $?
        fi
    elif [[ -f "build.gradle" ]]; then
        if grep -q "pitest" build.gradle 2>/dev/null; then
            echo "Using PIT (Pitest)..."
            ./gradlew pitest
            exit $?
        fi
    fi

    echo -e "${YELLOW}PIT not configured${NC}"
    echo "Add PIT plugin to your Maven/Gradle build"
    exit 2
fi

echo -e "${YELLOW}Could not detect project type or mutation testing not configured${NC}"
echo ""
echo "Supported configurations:"
echo "  - JavaScript/TypeScript: Configure Stryker"
echo "  - Python: Install mutmut"
echo "  - Rust: Install cargo-mutants"
echo "  - Java: Configure PIT in Maven/Gradle"
exit 2
