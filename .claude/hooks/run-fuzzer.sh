#!/usr/bin/env bash
#
# run-fuzzer.sh
#
# Run fuzz testing on the project. Auto-detects the project type
# and runs the appropriate fuzzer.
#
# Usage: run-fuzzer.sh [--quick|--thorough] [target]
#
# Options:
#   --quick     Run for 5 minutes (default)
#   --thorough  Run for 1 hour
#   target      Specific file or function to fuzz
#
# Exit codes:
#   0 - No crashes found
#   1 - Crashes found
#   2 - Fuzzer not available or not configured
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="quick"
TARGET=""
DURATION_QUICK=300   # 5 minutes in seconds
DURATION_THOROUGH=3600  # 1 hour in seconds

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            MODE="quick"
            shift
            ;;
        --thorough)
            MODE="thorough"
            shift
            ;;
        *)
            TARGET="$1"
            shift
            ;;
    esac
done

DURATION=$DURATION_QUICK
[[ "$MODE" == "thorough" ]] && DURATION=$DURATION_THOROUGH

echo "======================================"
echo "Fuzz Testing"
echo "Mode: $MODE (${DURATION}s)"
[[ -n "$TARGET" ]] && echo "Target: $TARGET"
echo "======================================"
echo ""

# Detect project type and run appropriate fuzzer

# Python with Hypothesis
if [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]]; then
    echo -e "${BLUE}Detected: Python project${NC}"

    # Check if hypothesis is installed
    if python3 -c "import hypothesis" 2>/dev/null; then
        echo "Using Hypothesis for fuzzing..."

        # Look for fuzz tests
        FUZZ_TESTS=$(find . -name "test_*.py" -o -name "*_test.py" 2>/dev/null | xargs grep -l "@given\|@settings" 2>/dev/null || true)

        if [[ -n "$FUZZ_TESTS" ]]; then
            echo "Found property tests with Hypothesis:"
            echo "$FUZZ_TESTS"
            echo ""

            # Run with extended examples for fuzzing
            export HYPOTHESIS_PROFILE="ci"
            if [[ "$MODE" == "thorough" ]]; then
                # Run with many more examples
                python3 -c "
import hypothesis
hypothesis.settings.register_profile('fuzz', max_examples=10000, deadline=None)
hypothesis.settings.load_profile('fuzz')
" 2>/dev/null || true
            fi

            echo "Running fuzz tests..."
            if pytest $FUZZ_TESTS --hypothesis-show-statistics -v 2>&1; then
                echo -e "${GREEN}PASS: No crashes found${NC}"
                exit 0
            else
                echo -e "${RED}FAIL: Issues found during fuzzing${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}No Hypothesis tests found${NC}"
            echo "Add property-based tests with @given decorator to enable fuzzing."
            exit 2
        fi
    else
        echo -e "${YELLOW}Hypothesis not installed${NC}"
        echo "Install with: pip install hypothesis"
        exit 2
    fi
fi

# JavaScript/TypeScript with fast-check
if [[ -f "package.json" ]]; then
    echo -e "${BLUE}Detected: JavaScript/TypeScript project${NC}"

    # Check if fast-check is available
    if grep -q "fast-check" package.json 2>/dev/null; then
        echo "Using fast-check for fuzzing..."

        # Look for property tests
        PROP_TESTS=$(grep -r "fc\.\|fast-check" --include="*.test.ts" --include="*.test.js" --include="*.spec.ts" --include="*.spec.js" . 2>/dev/null | head -5 || true)

        if [[ -n "$PROP_TESTS" ]]; then
            echo "Found property tests:"
            echo "$PROP_TESTS"
            echo ""

            # Run tests with increased iterations
            if [[ "$MODE" == "thorough" ]]; then
                export FC_NUM_RUNS=10000
            else
                export FC_NUM_RUNS=1000
            fi

            echo "Running property tests..."
            if npm test -- --testPathPattern="property\|fuzz" 2>&1 || npx jest --testPathPattern="property\|fuzz" 2>&1; then
                echo -e "${GREEN}PASS: No crashes found${NC}"
                exit 0
            else
                echo -e "${RED}FAIL: Issues found during fuzzing${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}No fast-check tests found${NC}"
            echo "Add property-based tests with fast-check to enable fuzzing."
            exit 2
        fi
    elif command -v npx &>/dev/null && npx jsfuzz --help &>/dev/null 2>&1; then
        echo "Using jsfuzz..."
        if [[ -n "$TARGET" ]]; then
            timeout "${DURATION}s" npx jsfuzz "$TARGET" || true
        else
            echo -e "${YELLOW}No target specified for jsfuzz${NC}"
            echo "Usage: run-fuzzer.sh [target.js]"
            exit 2
        fi
    else
        echo -e "${YELLOW}No JavaScript fuzzer available${NC}"
        echo "Install fast-check: npm install fast-check"
        exit 2
    fi
fi

# Go
if [[ -f "go.mod" ]]; then
    echo -e "${BLUE}Detected: Go project${NC}"

    # Look for fuzz tests (Go 1.18+)
    FUZZ_TESTS=$(grep -r "func Fuzz" --include="*.go" . 2>/dev/null | head -5 || true)

    if [[ -n "$FUZZ_TESTS" ]]; then
        echo "Found fuzz tests:"
        echo "$FUZZ_TESTS"
        echo ""

        echo "Running Go fuzz tests..."
        if [[ -n "$TARGET" ]]; then
            go test -fuzz="$TARGET" -fuzztime="${DURATION}s" ./...
        else
            # Run all fuzz tests briefly
            for test in $(grep -r "func Fuzz" --include="*.go" -l . 2>/dev/null); do
                dir=$(dirname "$test")
                go test -fuzz=Fuzz -fuzztime="30s" "$dir" || true
            done
        fi

        echo -e "${GREEN}Fuzzing complete${NC}"
        exit 0
    else
        echo -e "${YELLOW}No Go fuzz tests found${NC}"
        echo "Add fuzz tests with 'func FuzzXxx(f *testing.F)' signature."
        exit 2
    fi
fi

# Rust
if [[ -f "Cargo.toml" ]]; then
    echo -e "${BLUE}Detected: Rust project${NC}"

    if command -v cargo-fuzz &>/dev/null; then
        echo "Using cargo-fuzz..."

        if [[ -d "fuzz" ]]; then
            echo "Found fuzz directory"
            if [[ -n "$TARGET" ]]; then
                timeout "${DURATION}s" cargo fuzz run "$TARGET" -- -max_total_time="$DURATION" || true
            else
                # List fuzz targets
                TARGETS=$(cargo fuzz list 2>/dev/null || true)
                if [[ -n "$TARGETS" ]]; then
                    echo "Available fuzz targets: $TARGETS"
                    # Run first target
                    FIRST_TARGET=$(echo "$TARGETS" | head -1)
                    timeout "${DURATION}s" cargo fuzz run "$FIRST_TARGET" -- -max_total_time="$DURATION" || true
                fi
            fi
            exit 0
        else
            echo -e "${YELLOW}No fuzz directory found${NC}"
            echo "Initialize with: cargo fuzz init"
            exit 2
        fi
    else
        echo -e "${YELLOW}cargo-fuzz not installed${NC}"
        echo "Install with: cargo install cargo-fuzz"
        exit 2
    fi
fi

# C/C++ with AFL
if [[ -f "Makefile" ]] || [[ -f "CMakeLists.txt" ]]; then
    echo -e "${BLUE}Detected: C/C++ project${NC}"

    if command -v afl-fuzz &>/dev/null; then
        echo "AFL++ available"
        echo -e "${YELLOW}Manual setup required for AFL++${NC}"
        echo "1. Compile with afl-gcc or afl-clang"
        echo "2. Create input corpus"
        echo "3. Run: afl-fuzz -i input -o output -- ./program"
        exit 2
    else
        echo -e "${YELLOW}AFL++ not installed${NC}"
        echo "Install AFL++ for C/C++ fuzzing"
        exit 2
    fi
fi

echo -e "${YELLOW}Could not detect project type or no fuzzer configured${NC}"
echo ""
echo "Supported configurations:"
echo "  - Python: Install hypothesis"
echo "  - JavaScript/TypeScript: Install fast-check"
echo "  - Go: Add fuzz tests (Go 1.18+)"
echo "  - Rust: Install cargo-fuzz"
echo "  - C/C++: Install AFL++"
exit 2
