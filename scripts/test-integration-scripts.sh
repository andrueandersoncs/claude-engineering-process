#!/usr/bin/env bash
#
# test-integration-scripts.sh
#
# Integration tests for scripts that require real project environments.
# These tests use fixture projects to validate run-validation.sh,
# quick-verification.sh, and other project-dependent scripts.
#
# Usage: ./test-integration-scripts.sh [--verbose] [--no-install]
#
# Options:
#   --verbose     Show detailed output
#   --no-install  Skip automatic dependency installation
#
# Exit codes:
#   0 - All tests pass
#   1 - Some tests failed
#
# Prerequisites (auto-installed if missing):
#   - Node.js 18+ (for node:test)
#   - Python 3.8+ with pytest
#

set -euo pipefail

# Get script directory using portable method
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/test-fixtures"

# Parse arguments
VERBOSE=""
NO_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE="--verbose"
            shift
            ;;
        --no-install)
            NO_INSTALL=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Temporary test directory
export TEST_TMPDIR=""

# Dependency checks
HAS_NODE=false
HAS_PYTHON=false
HAS_PYTEST=false
NODE_VERSION=""
PYTHON_VERSION=""

#
# Dependency Detection and Installation
#

# Virtual environment for test dependencies
TEST_VENV_DIR="$SCRIPT_DIR/.test-venv"

setup_test_venv() {
    echo -e "  ${BLUE}→${NC} Setting up test virtual environment..."

    # Create venv if it doesn't exist
    if [[ ! -d "$TEST_VENV_DIR" ]]; then
        # Try uv first (faster), then python3 -m venv
        if command -v uv &>/dev/null; then
            if uv venv "$TEST_VENV_DIR" 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} Created venv with uv"
            else
                python3 -m venv "$TEST_VENV_DIR"
                echo -e "  ${GREEN}✓${NC} Created venv with python3"
            fi
        else
            python3 -m venv "$TEST_VENV_DIR"
            echo -e "  ${GREEN}✓${NC} Created venv with python3"
        fi
    fi

    # Activate the venv for this script
    # shellcheck source=/dev/null
    source "$TEST_VENV_DIR/bin/activate"
    echo -e "  ${GREEN}✓${NC} Activated test venv"
}

install_pytest() {
    echo -e "  ${BLUE}→${NC} Installing pytest in test venv..."

    # Use uv if available (faster), otherwise pip
    if command -v uv &>/dev/null; then
        if uv pip install pytest 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} pytest installed via uv"
            return 0
        fi
    fi

    # Fallback to pip in venv
    if pip install pytest 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} pytest installed via pip"
        return 0
    fi

    echo -e "  ${RED}✗${NC} Failed to install pytest"
    return 1
}

cleanup_test_venv() {
    # Deactivate venv if active
    if [[ -n "${VIRTUAL_ENV:-}" ]]; then
        deactivate 2>/dev/null || true
    fi
}

check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    echo ""

    # Check Node.js
    if command -v node &>/dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
        # Node 18+ has built-in test runner
        local major_version
        major_version=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
        if [[ "$major_version" -ge 18 ]]; then
            HAS_NODE=true
            echo -e "  ${GREEN}✓${NC} Node.js $NODE_VERSION (test runner available)"
        else
            echo -e "  ${YELLOW}⚠${NC} Node.js $NODE_VERSION (need 18+ for built-in test runner)"
        fi
    else
        echo -e "  ${RED}✗${NC} Node.js not found (required)"
        echo -e "    Install Node.js 18+ to run all tests"
    fi

    # Check Python
    if command -v python3 &>/dev/null; then
        PYTHON_VERSION=$(python3 --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
        HAS_PYTHON=true
        echo -e "  ${GREEN}✓${NC} Python $PYTHON_VERSION"

        # Setup test venv and check/install pytest
        if [[ "$NO_INSTALL" == "false" ]]; then
            setup_test_venv
        fi

        # Check pytest - install if missing
        if python3 -c "import pytest" 2>/dev/null; then
            HAS_PYTEST=true
            PYTEST_VERSION=$(python3 -c "import pytest; print(pytest.__version__)" 2>/dev/null || echo "unknown")
            echo -e "  ${GREEN}✓${NC} pytest $PYTEST_VERSION"
        else
            if [[ "$NO_INSTALL" == "false" ]]; then
                if install_pytest; then
                    # Verify installation worked
                    if python3 -c "import pytest" 2>/dev/null; then
                        HAS_PYTEST=true
                        PYTEST_VERSION=$(python3 -c "import pytest; print(pytest.__version__)" 2>/dev/null || echo "unknown")
                        echo -e "  ${GREEN}✓${NC} pytest $PYTEST_VERSION"
                    fi
                fi
            else
                echo -e "  ${YELLOW}○${NC} pytest not installed (--no-install specified)"
            fi
        fi
    else
        echo -e "  ${RED}✗${NC} Python not found (required for Python tests)"
    fi

    echo ""

    # Fail fast if critical dependencies are missing
    if [[ "$HAS_NODE" != "true" ]]; then
        echo -e "${RED}ERROR: Node.js 18+ is required to run tests${NC}"
        echo "Install Node.js from https://nodejs.org/"
        exit 1
    fi

    if [[ "$HAS_PYTHON" != "true" ]]; then
        echo -e "${RED}ERROR: Python 3 is required to run tests${NC}"
        echo "Install Python from https://python.org/"
        exit 1
    fi

    if [[ "$HAS_PYTEST" != "true" ]]; then
        echo -e "${RED}ERROR: pytest is required to run Python tests${NC}"
        echo "Install with: pip3 install pytest"
        exit 1
    fi
}

#
# Test Framework Functions
#

setup_project_test() {
    local fixture_name="$1"
    TEST_TMPDIR=$(mktemp -d)

    # Copy fixture to temp directory
    if [[ -d "$FIXTURES_DIR/$fixture_name" ]]; then
        cp -r "$FIXTURES_DIR/$fixture_name/"* "$TEST_TMPDIR/"
        if [[ "$VERBOSE" == "--verbose" ]]; then
            echo -e "${BLUE}[SETUP]${NC} Created test project: $TEST_TMPDIR (from $fixture_name)" >&2
        fi
    else
        echo -e "${RED}[ERROR]${NC} Fixture not found: $fixture_name" >&2
        return 1
    fi
}

teardown_project_test() {
    if [[ -n "$TEST_TMPDIR" && -d "$TEST_TMPDIR" ]]; then
        rm -rf "$TEST_TMPDIR"
        if [[ "$VERBOSE" == "--verbose" ]]; then
            echo -e "${BLUE}[CLEANUP]${NC} Removed: $TEST_TMPDIR" >&2
        fi
    fi
    TEST_TMPDIR=""
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"

    ((TESTS_RUN++)) || true
    if [[ "$expected" == "$actual" ]]; then
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} $test_name (exit=$actual)"
    else
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} $test_name (expected=$expected, got=$actual)"
    fi
}

assert_output_contains() {
    local pattern="$1"
    local output="$2"
    local test_name="$3"

    ((TESTS_RUN++)) || true
    if echo "$output" | grep -q "$pattern"; then
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} $test_name (contains: '$pattern')"
    else
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} $test_name (missing: '$pattern')"
        if [[ "$VERBOSE" == "--verbose" ]]; then
            echo "    Output was: ${output:0:200}..." >&2
        fi
    fi
}

assert_output_not_contains() {
    local pattern="$1"
    local output="$2"
    local test_name="$3"

    ((TESTS_RUN++)) || true
    if ! echo "$output" | grep -q "$pattern"; then
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} $test_name (does not contain: '$pattern')"
    else
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} $test_name (unexpectedly contains: '$pattern')"
    fi
}

skip_test() {
    local test_name="$1"
    local reason="$2"
    ((TESTS_RUN++)) || true
    ((TESTS_SKIPPED++)) || true
    echo -e "${YELLOW}[SKIP]${NC} $test_name ($reason)"
}

run_project_test() {
    local test_name="$1"
    local fixture_name="$2"
    local test_func="$3"

    setup_project_test "$fixture_name" || return 1

    local saved_pwd="$PWD"
    cd "$TEST_TMPDIR"
    "$test_func"
    cd "$saved_pwd"

    teardown_project_test
}

#
# run-validation.sh Tests
#

test_run_validation_node_passing() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-validation: node passing tests" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" 2>&1) || exit_code=$?

    assert_exit_code 0 "$exit_code" "run-validation: node project passes"
    assert_output_contains "PASS\|passed\|Validation PASSED" "$output" "run-validation: shows pass status"
}

test_run_validation_node_failing_tests() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-validation: node failing tests" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" 2>&1) || exit_code=$?

    assert_exit_code 1 "$exit_code" "run-validation: node project with failing tests fails"
    assert_output_contains "FAIL\|failed" "$output" "run-validation: shows fail status"
}

test_run_validation_node_failing_lint() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-validation: node failing lint" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    # Set SKIP_TESTS to only test lint
    SKIP_TESTS=1 output=$("$SCRIPT_DIR/run-validation.sh" 2>&1) || exit_code=$?

    assert_exit_code 1 "$exit_code" "run-validation: node project with failing lint fails"
}

test_run_validation_quick_mode_node() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-validation: node quick mode" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" --quick 2>&1) || exit_code=$?

    assert_exit_code 0 "$exit_code" "run-validation: quick mode works for node"
    assert_output_contains "SKIP.*[Tt]ests\|Tests.*quick" "$output" "run-validation: quick mode skips tests"
}

test_run_validation_python_passing() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" 2>&1) || exit_code=$?

    assert_exit_code 0 "$exit_code" "run-validation: python project passes"
    assert_output_contains "Tests passed\|PASS" "$output" "run-validation: python tests pass"
}

#
# quick-verification.sh Tests
#

test_quick_verification_node_passing() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "quick-verification: node passing" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/quick-verification.sh" 2>&1) || exit_code=$?

    assert_exit_code 0 "$exit_code" "quick-verification: node project passes"
    assert_output_contains "node\|Node" "$output" "quick-verification: detects node project"
}

test_quick_verification_node_failing() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "quick-verification: node failing" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/quick-verification.sh" 2>&1) || exit_code=$?

    assert_exit_code 1 "$exit_code" "quick-verification: node project with failures fails"
    assert_output_contains "failed\|FAIL" "$output" "quick-verification: shows failures"
}

test_quick_verification_python_passing() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/quick-verification.sh" 2>&1) || exit_code=$?

    assert_exit_code 0 "$exit_code" "quick-verification: python project passes"
    assert_output_contains "python\|Python" "$output" "quick-verification: detects python project"
}

test_quick_verification_detects_project_type() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/quick-verification.sh" 2>&1) || exit_code=$?

    assert_output_contains "Project type:" "$output" "quick-verification: shows project type"
}

test_quick_verification_with_file_path() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "quick-verification: with file path" "Node.js 18+ not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/quick-verification.sh" "src/index.js" 2>&1) || exit_code=$?

    # Should still work and detect node project
    assert_output_contains "node\|Node" "$output" "quick-verification: works with file path"
}

#
# run-mutation-tests.sh Tests (detection only)
#

test_run_mutation_not_configured_node() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-mutation-tests: node not configured" "Node.js not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-mutation-tests.sh" 2>&1) || exit_code=$?

    # Should exit 2 when Stryker not configured
    assert_exit_code 2 "$exit_code" "run-mutation-tests: exits 2 when not configured"
    assert_output_contains "Stryker not configured\|not configured" "$output" "run-mutation-tests: tells user to configure"
}

test_run_mutation_not_configured_python() {
    if [[ "$HAS_PYTHON" != "true" ]]; then
        skip_test "run-mutation-tests: python not configured" "Python not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-mutation-tests.sh" 2>&1) || exit_code=$?

    # Should exit 2 when mutmut not installed
    assert_exit_code 2 "$exit_code" "run-mutation-tests: python exits 2 when not configured"
}

#
# run-fuzzer.sh Tests (detection only)
#

test_run_fuzzer_not_configured_node() {
    if [[ "$HAS_NODE" != "true" ]]; then
        skip_test "run-fuzzer: node not configured" "Node.js not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-fuzzer.sh" 2>&1) || exit_code=$?

    # Should exit 2 when fast-check not configured
    assert_exit_code 2 "$exit_code" "run-fuzzer: exits 2 when not configured"
}

test_run_fuzzer_not_configured_python() {
    if [[ "$HAS_PYTHON" != "true" ]]; then
        skip_test "run-fuzzer: python not configured" "Python not available"
        return
    fi

    local output exit_code=0
    output=$("$SCRIPT_DIR/run-fuzzer.sh" 2>&1) || exit_code=$?

    # Should exit 2 when hypothesis not installed
    assert_exit_code 2 "$exit_code" "run-fuzzer: python exits 2 when not configured"
}

#
# Main Test Runner
#

echo "=============================================="
echo "Integration Tests for Project-Dependent Scripts"
echo "=============================================="
echo ""

check_dependencies

# Verify fixtures exist
if [[ ! -d "$FIXTURES_DIR" ]]; then
    echo -e "${RED}ERROR: Test fixtures directory not found: $FIXTURES_DIR${NC}"
    echo "Run this script from the scripts/ directory or ensure fixtures exist."
    exit 1
fi

echo -e "${BLUE}━━━ Testing: run-validation.sh (Node.js) ━━━${NC}"
run_project_test "run-validation node passing" "node-project" test_run_validation_node_passing
run_project_test "run-validation node failing tests" "node-failing" test_run_validation_node_failing_tests
run_project_test "run-validation quick mode node" "node-project" test_run_validation_quick_mode_node
echo ""

echo -e "${BLUE}━━━ Testing: run-validation.sh (Python) ━━━${NC}"
run_project_test "run-validation python passing" "python-project" test_run_validation_python_passing
echo ""

echo -e "${BLUE}━━━ Testing: quick-verification.sh (Node.js) ━━━${NC}"
run_project_test "quick-verification node passing" "node-project" test_quick_verification_node_passing
run_project_test "quick-verification node failing" "node-failing" test_quick_verification_node_failing
run_project_test "quick-verification detects type" "node-project" test_quick_verification_detects_project_type
run_project_test "quick-verification with file" "node-project" test_quick_verification_with_file_path
echo ""

echo -e "${BLUE}━━━ Testing: quick-verification.sh (Python) ━━━${NC}"
run_project_test "quick-verification python passing" "python-project" test_quick_verification_python_passing
echo ""

echo -e "${BLUE}━━━ Testing: run-mutation-tests.sh (detection) ━━━${NC}"
run_project_test "run-mutation-tests node not configured" "node-project" test_run_mutation_not_configured_node
run_project_test "run-mutation-tests python not configured" "python-project" test_run_mutation_not_configured_python
echo ""

echo -e "${BLUE}━━━ Testing: run-fuzzer.sh (detection) ━━━${NC}"
run_project_test "run-fuzzer node not configured" "node-project" test_run_fuzzer_not_configured_node
run_project_test "run-fuzzer python not configured" "python-project" test_run_fuzzer_not_configured_python
echo ""

#
# Summary
#

echo "=============================================="
echo "Integration Test Summary"
echo "=============================================="
echo -e "Total:   ${TESTS_RUN}"
echo -e "Passed:  ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:  ${RED}${TESTS_FAILED}${NC}"
echo -e "Skipped: ${YELLOW}${TESTS_SKIPPED}${NC}"
echo ""

# Cleanup
cleanup_test_venv

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}SOME TESTS FAILED${NC}"
    exit 1
elif [[ $TESTS_RUN -eq $TESTS_SKIPPED ]]; then
    echo -e "${YELLOW}ALL TESTS SKIPPED (missing dependencies)${NC}"
    exit 0
else
    echo -e "${GREEN}ALL TESTS PASSED${NC}"
    exit 0
fi
