#!/usr/bin/env bash
#
# test-verification-scripts.sh
#
# Unit tests for the verification scripts.
# Creates temporary fixtures and validates script behavior.
#
# Usage: ./test-verification-scripts.sh [--verbose]
#
# Exit codes:
#   0 - All tests pass
#   1 - Some tests failed
#

set -euo pipefail

# Get script directory using portable method
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERBOSE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Temporary test directory - use global to persist across functions
export TEST_TMPDIR=""

#
# Test Framework Functions
#

setup_test() {
    TEST_TMPDIR=$(mktemp -d)
    mkdir -p "$TEST_TMPDIR/docs/stories"
    if [[ "$VERBOSE" == "--verbose" ]]; then
        echo -e "${BLUE}[SETUP]${NC} Created: $TEST_TMPDIR" >&2
    fi
}

cleanup_test() {
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
            echo "    Output was: $output" >&2
        fi
    fi
}

assert_json_field() {
    local json="$1"
    local field="$2"
    local expected="$3"
    local test_name="$4"

    ((TESTS_RUN++)) || true
    local actual
    actual=$(echo "$json" | jq -r "$field" 2>/dev/null || echo "PARSE_ERROR")

    if [[ "$actual" == "$expected" ]]; then
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} $test_name ($field='$expected')"
    else
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} $test_name ($field expected='$expected', got='$actual')"
    fi
}

#
# Fixture Creation Helpers
#

create_story() {
    local slug="$1"
    local phase="$2"
    local completed="${3:-[]}"

    mkdir -p "$TEST_TMPDIR/docs/stories/$slug"
    cat > "$TEST_TMPDIR/docs/stories/$slug/workflow-state.json" << JSONEOF
{"story":"Test Story: $slug","slug":"$slug","currentPhase":"$phase","completedPhases":$completed}
JSONEOF
}

create_research_notes() {
    local slug="$1"
    local content="${2:-}"

    cat > "$TEST_TMPDIR/docs/stories/$slug/research-notes.md" << MDEOF
# Research Notes

## Relevant Code Locations
- src/main.ts

## Test Infrastructure
- Uses Jest for testing

## Ontology Check
Terms verified: API, User

$content
MDEOF
}

create_design_doc() {
    local slug="$1"
    local content="${2:-}"

    cat > "$TEST_TMPDIR/docs/stories/$slug/design.md" << MDEOF
# Design Document

## Overview
Test design document.

## Test Architecture
- Unit tests for core logic
- E2E tests for user flows

$content
MDEOF
}

create_tasks_doc() {
    local slug="$1"
    local content="${2:-}"

    cat > "$TEST_TMPDIR/docs/stories/$slug/tasks.md" << MDEOF
# Tasks

## Task 1: Write E2E test
Test: e2e/flow.spec.ts
Completion criteria: Test passes

$content
MDEOF
}

create_tasks_with_checkboxes() {
    local slug="$1"

    cat > "$TEST_TMPDIR/docs/stories/$slug/tasks.md" << 'MDEOF'
# Tasks

## Implementation Tasks

- [ ] **Task 1.1**: Set up project structure
  - **Description**: Create the base directory structure
  - **Files**: `src/index.ts`
  - **Done when**: Directory structure exists

- [ ] **Task 1.2**: Implement core logic
  - **Description**: Implement the main function
  - **Files**: `src/main.ts`
  - **Done when**: Main function works
  - **Depends on**: Task 1.1

- [x] **Task 1.3**: Completed task
  - **Description**: Already done
  - **Files**: `src/done.ts`
  - **Done when**: Done

MDEOF
}

#
# Run a single test with proper setup/cleanup
#
run_test() {
    local test_name="$1"
    local test_func="$2"

    setup_test
    # Run test in the TEST_TMPDIR context
    local saved_pwd="$PWD"
    cd "$TEST_TMPDIR"
    "$test_func"
    cd "$saved_pwd"
    cleanup_test
}

#
# Test Functions
#

test_phase_gate_no_workflow() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" check 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: no workflow allows"
}

test_phase_gate_list_empty() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" list 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: list empty works"
}

test_phase_gate_list_with_stories() {
    create_story "test-story" "research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" list 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: list with stories"
    assert_output_contains "test-story" "$output" "phase-gate: shows story slug"
}

test_phase_gate_prewrite_understand_blocks() {
    create_story "blocked" "understand"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" pre-write "blocked" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "phase-gate: blocks understand phase"
}

test_phase_gate_prewrite_research_blocks() {
    create_story "research-story" "research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" pre-write "research-story" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "phase-gate: blocks research phase"
}

test_phase_gate_prewrite_implement_with_design() {
    create_story "impl-story" "implement"
    create_design_doc "impl-story"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" pre-write "impl-story" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: allows implement with design"
}

test_phase_gate_prewrite_implement_no_design() {
    create_story "impl-no-design" "implement"
    # No design.md - should block
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" pre-write "impl-no-design" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "phase-gate: blocks implement without design"
}

test_phase_gate_prewrite_scope_warns() {
    create_story "scope-story" "scope"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" pre-write "scope-story" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: allows scope with warning"
}

test_phase_gate_preconditions_scope_no_research() {
    create_story "scope-no-research" "research"
    # No research-notes.md - preconditions should fail
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" preconditions "scope-no-research" "scope" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "phase-gate: preconditions for scope fail without research notes"
}

test_phase_gate_preconditions_scope_with_research() {
    create_story "scope-with-research" "research"
    create_research_notes "scope-with-research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/phase-gate.sh" preconditions "scope-with-research" "scope" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "phase-gate: preconditions for scope pass with research notes"
}

test_validate_criteria_no_workflow() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: no workflow"
    assert_json_field "$output" ".recommendation" "NO_WORKFLOW" "validate-criteria: returns NO_WORKFLOW"
}

test_validate_criteria_research_without_notes() {
    create_story "research-no-notes" "research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "research" "research-no-notes" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "validate-criteria: research without notes blocks"
}

test_validate_criteria_research_with_notes() {
    create_story "research-with-notes" "research"
    create_research_notes "research-with-notes"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "research" "research-with-notes" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: research with notes passes"
    assert_json_field "$output" ".recommendation" "AUTO_ADVANCE" "validate-criteria: returns AUTO_ADVANCE"
}

test_validate_criteria_design_without_design_doc() {
    create_story "design-no-doc" "design"
    create_research_notes "design-no-doc"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "design" "design-no-doc" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "validate-criteria: design without doc blocks"
}

test_validate_criteria_design_with_doc() {
    create_story "design-with-doc" "design"
    create_research_notes "design-with-doc"
    create_design_doc "design-with-doc"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "design" "design-with-doc" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: design with doc passes"
}

test_validate_criteria_complete_phase() {
    create_story "complete-story" "complete"
    create_research_notes "complete-story"
    create_design_doc "complete-story"
    create_tasks_doc "complete-story"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "complete" "complete-story" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: complete phase passes"
}

test_validate_criteria_understand_blocks() {
    create_story "understand-story" "understand"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "understand" "understand-story" 2>&1 </dev/null) || exit_code=$?
    # Understand phase always blocks (requires user confirmation)
    assert_exit_code 1 "$exit_code" "validate-criteria: understand phase blocks"
    assert_json_field "$output" ".recommendation" "BLOCK" "validate-criteria: understand returns BLOCK"
}

test_validate_criteria_scope_without_research() {
    create_story "scope-no-research" "scope"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "scope" "scope-no-research" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "validate-criteria: scope without research blocks"
}

test_validate_criteria_scope_with_research() {
    create_story "scope-with-research" "scope"
    # Need both "## Scope" section AND test scope pattern for full pass
    create_research_notes "scope-with-research" "
## Scope
- Authentication feature only

## Test Scope
Required tests: e2e tests for user flow"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "scope" "scope-with-research" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: scope with research passes"
}

test_validate_criteria_decompose_without_tasks() {
    create_story "decompose-no-tasks" "decompose"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "decompose" "decompose-no-tasks" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "validate-criteria: decompose without tasks blocks"
}

test_validate_criteria_decompose_with_tasks() {
    create_story "decompose-with-tasks" "decompose"
    create_tasks_doc "decompose-with-tasks" "## E2E Test Task\nDone when: tests pass"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "decompose" "decompose-with-tasks" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "validate-criteria: decompose with tasks passes"
}

test_verify_requirements_clean() {
    create_story "clean-reqs" "research"
    cat > "$TEST_TMPDIR/docs/stories/clean-reqs/requirements.md" << 'REQEOF'
# Requirements
All requirements are clear and documented.
REQEOF
    local output exit_code=0
    output=$("$SCRIPT_DIR/verify-requirements.sh" "clean-reqs" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "verify-requirements: clean passes"
    assert_output_contains "VERIFICATION PASSED" "$output" "verify-requirements: shows passed"
}

test_verify_requirements_with_questions() {
    create_story "has-questions" "research"
    cat > "$TEST_TMPDIR/docs/stories/has-questions/requirements.md" << 'REQEOF'
# Requirements
What should happen when ??? the user clicks?
REQEOF
    local output exit_code=0
    output=$("$SCRIPT_DIR/verify-requirements.sh" "has-questions" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "verify-requirements: ??? causes failure"
}

test_verify_requirements_blocked() {
    create_story "is-blocked" "research"
    cat > "$TEST_TMPDIR/docs/stories/is-blocked/requirements.md" << 'REQEOF'
# Requirements
This story is BLOCKED pending API decision.
REQEOF
    local output exit_code=0
    output=$("$SCRIPT_DIR/verify-requirements.sh" "is-blocked" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 2 "$exit_code" "verify-requirements: BLOCKED causes exit 2"
}

test_verify_requirements_unresolved() {
    create_story "has-unresolved" "research"
    cat > "$TEST_TMPDIR/docs/stories/has-unresolved/requirements.md" << 'REQEOF'
# Requirements
This requirement is UNRESOLVED and needs clarification.
REQEOF
    local output exit_code=0
    output=$("$SCRIPT_DIR/verify-requirements.sh" "has-unresolved" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "verify-requirements: UNRESOLVED causes failure"
}

test_verify_requirements_no_story() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/verify-requirements.sh" "nonexistent-story" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "verify-requirements: missing story fails"
}

test_detect_contradictions_clean() {
    create_story "no-contra" "research"
    create_research_notes "no-contra" "Simple requirements that are well defined."
    local output exit_code=0
    output=$("$SCRIPT_DIR/detect-contradictions.sh" "no-contra" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "detect-contradictions: clean passes"
}

test_detect_contradictions_explicit() {
    create_story "has-contra" "research"
    create_research_notes "has-contra" "CONTRADICTION: API requires auth but spec says public"
    local output exit_code=0
    output=$("$SCRIPT_DIR/detect-contradictions.sh" "has-contra" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 2 "$exit_code" "detect-contradictions: CONTRADICTION causes exit 2"
}

test_detect_contradictions_warnings() {
    create_story "has-warnings" "research"
    # Create notes with "conflict" keyword which triggers a warning but not a blocking contradiction
    create_research_notes "has-warnings" "There may be a conflict between the auth and public API requirements."
    local output exit_code=0
    output=$("$SCRIPT_DIR/detect-contradictions.sh" "has-warnings" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "detect-contradictions: conflict keyword causes exit 1 (warning)"
}

test_completion_check_no_workflow() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: no workflow allows"
}

test_completion_check_complete() {
    create_story "done-story" "complete"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: complete allows"
}

test_completion_check_understand_blocks() {
    create_story "understand-stop" "understand"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 2 "$exit_code" "completion-check: understand blocks"
}

test_completion_check_implement_warns() {
    create_story "impl-stop" "implement"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: implement allows with warning"
}

test_completion_check_research_blocks() {
    create_story "research-stop" "research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 2 "$exit_code" "completion-check: research blocks"
}

test_completion_check_scope_blocks() {
    create_story "scope-stop" "scope"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 2 "$exit_code" "completion-check: scope blocks"
}

test_completion_check_design_warns() {
    create_story "design-stop" "design"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: design allows with warning"
}

test_completion_check_decompose_warns() {
    create_story "decompose-stop" "decompose"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: decompose allows with warning"
}

test_completion_check_validate_warns() {
    create_story "validate-stop" "validate"
    local output exit_code=0
    output=$("$SCRIPT_DIR/completion-check.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "completion-check: validate allows with warning"
}

test_run_validation_no_project() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "run-validation: no project passes"
    assert_output_contains "SKIP" "$output" "run-validation: shows skip"
}

test_run_validation_quick_mode() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/run-validation.sh" --quick 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "run-validation: quick mode works"
}

test_enforce_non_workflow() {
    local output exit_code=0
    echo '{"tool_input":{"file_path":"src/main.ts","content":"{}"}}' | \
        output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows non-workflow files"
}

test_enforce_research_to_scope_blocks() {
    create_story "r2s-test" "research"
    # No research notes - should block
    local file_path="$TEST_TMPDIR/docs/stories/r2s-test/workflow-state.json"
    local new_content='{"currentPhase":"scope"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 2 "$exit_code" "enforce: blocks research->scope without notes"
}

test_enforce_research_to_scope_with_notes() {
    create_story "r2s-pass" "research"
    create_research_notes "r2s-pass"
    local file_path="$TEST_TMPDIR/docs/stories/r2s-pass/workflow-state.json"
    local new_content='{"currentPhase":"scope"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows research->scope with notes"
}

test_enforce_scope_to_design() {
    create_story "s2d-test" "scope"
    create_research_notes "s2d-test"
    local file_path="$TEST_TMPDIR/docs/stories/s2d-test/workflow-state.json"
    local new_content='{"currentPhase":"design"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows scope->design"
}

test_enforce_design_to_decompose_blocks() {
    create_story "d2d-block" "design"
    # No design.md - should block
    local file_path="$TEST_TMPDIR/docs/stories/d2d-block/workflow-state.json"
    local new_content='{"currentPhase":"decompose"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 2 "$exit_code" "enforce: blocks design->decompose without design.md"
}

test_enforce_design_to_decompose_with_design() {
    create_story "d2d-pass" "design"
    create_design_doc "d2d-pass"
    local file_path="$TEST_TMPDIR/docs/stories/d2d-pass/workflow-state.json"
    local new_content='{"currentPhase":"decompose"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows design->decompose with design.md"
}

test_enforce_decompose_to_implement_blocks() {
    create_story "dec2i-block" "decompose"
    create_design_doc "dec2i-block"
    # No tasks.md - should block
    local file_path="$TEST_TMPDIR/docs/stories/dec2i-block/workflow-state.json"
    local new_content='{"currentPhase":"implement"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 2 "$exit_code" "enforce: blocks decompose->implement without tasks.md"
}

test_enforce_decompose_to_implement_with_tasks() {
    create_story "dec2i-pass" "decompose"
    create_design_doc "dec2i-pass"
    create_tasks_doc "dec2i-pass"
    local file_path="$TEST_TMPDIR/docs/stories/dec2i-pass/workflow-state.json"
    local new_content='{"currentPhase":"implement"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows decompose->implement with tasks.md"
}

test_enforce_same_phase_allows() {
    create_story "same-phase" "implement"
    create_design_doc "same-phase"
    create_tasks_doc "same-phase"
    local file_path="$TEST_TMPDIR/docs/stories/same-phase/workflow-state.json"
    local new_content='{"currentPhase":"implement"}'
    local input
    input=$(jq -n --arg fp "$file_path" --arg content "$new_content" '{tool_input:{file_path:$fp,content:$content}}')
    local output exit_code=0
    echo "$input" | output=$("$SCRIPT_DIR/enforce-phase-transition.sh" 2>&1) || exit_code=$?
    assert_exit_code 0 "$exit_code" "enforce: allows same phase (no transition)"
}

#
# mark-complete.sh tests
#

test_mark_complete_no_args() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "mark-complete: fails without args"
}

test_mark_complete_missing_file() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "nonexistent.md" "1.1" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "mark-complete: fails with missing file"
}

test_mark_complete_task() {
    create_story "mark-test" "implement"
    create_tasks_with_checkboxes "mark-test"
    local tasks_file="$TEST_TMPDIR/docs/stories/mark-test/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "1.1" "complete" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "mark-complete: marks task as complete"
    # Verify the task was updated
    if grep -q '\[x\] \*\*Task 1.1\*\*' "$tasks_file"; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} mark-complete: file updated correctly"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} mark-complete: file not updated correctly"
    fi
}

test_mark_complete_in_progress() {
    create_story "mark-progress" "implement"
    create_tasks_with_checkboxes "mark-progress"
    local tasks_file="$TEST_TMPDIR/docs/stories/mark-progress/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "1.1" "in_progress" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "mark-complete: marks task as in_progress"
    # Verify the task was updated
    if grep -q '\[~\] \*\*Task 1.1\*\*' "$tasks_file"; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} mark-complete: in_progress marker correct"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} mark-complete: in_progress marker incorrect"
    fi
}

test_mark_complete_nonexistent_task() {
    create_story "mark-noexist" "implement"
    create_tasks_with_checkboxes "mark-noexist"
    local tasks_file="$TEST_TMPDIR/docs/stories/mark-noexist/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "9.9" "complete" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "mark-complete: fails for nonexistent task"
}

#
# next-task.sh tests
#

test_next_task_no_args() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "next-task: fails without args"
}

test_next_task_missing_file() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "nonexistent.md" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "next-task: fails with missing file"
}

test_next_task_returns_first_incomplete() {
    create_story "next-test" "implement"
    create_tasks_with_checkboxes "next-test"
    local tasks_file="$TEST_TMPDIR/docs/stories/next-test/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: returns next task"
    # Check that it returns task 1.1 (first incomplete)
    if echo "$output" | jq -e '.id == "1.1"' >/dev/null 2>&1; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: returns correct task 1.1"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: did not return task 1.1"
    fi
}

test_next_task_count() {
    create_story "next-count" "implement"
    create_tasks_with_checkboxes "next-count"
    local tasks_file="$TEST_TMPDIR/docs/stories/next-count/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" --count 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: --count works"
    # Should return 2 (two incomplete tasks)
    if [[ "$output" == "2" ]]; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: count returns 2"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: count returned '$output', expected '2'"
    fi
}

test_next_task_all() {
    create_story "next-all" "implement"
    create_tasks_with_checkboxes "next-all"
    local tasks_file="$TEST_TMPDIR/docs/stories/next-all/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" --all 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: --all works"
    # Should return array with 3 tasks
    if echo "$output" | jq -e 'length == 3' >/dev/null 2>&1; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: --all returns 3 tasks"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: --all did not return 3 tasks"
    fi
}

#
# show-status.sh tests
#

test_show_status_no_workflow() {
    local output exit_code=0
    output=$("$SCRIPT_DIR/show-status.sh" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 1 "$exit_code" "show-status: fails when no workflow"
    assert_output_contains "No active workflow" "$output" "show-status: shows no workflow message"
}

test_show_status_with_story() {
    create_story "status-test" "implement"
    create_design_doc "status-test"
    create_tasks_with_checkboxes "status-test"
    local output exit_code=0
    output=$("$SCRIPT_DIR/show-status.sh" "status-test" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "show-status: works with story"
    assert_output_contains "status-test" "$output" "show-status: shows story slug"
    assert_output_contains "implement" "$output" "show-status: shows current phase"
}

test_show_status_compact() {
    create_story "status-compact" "design"
    local output exit_code=0
    output=$("$SCRIPT_DIR/show-status.sh" "status-compact" --compact 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "show-status: compact mode works"
    assert_output_contains "design" "$output" "show-status: compact shows phase"
}

test_show_status_json() {
    create_story "status-json" "research"
    local output exit_code=0
    output=$("$SCRIPT_DIR/show-status.sh" "status-json" --json 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "show-status: json mode works"
    assert_json_field "$output" ".currentPhase" "research" "show-status: json has correct phase"
}

#
# mark-complete.sh edge cases
#

test_mark_complete_blocked() {
    create_story "mark-blocked" "implement"
    create_tasks_with_checkboxes "mark-blocked"
    local tasks_file="$TEST_TMPDIR/docs/stories/mark-blocked/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "1.1" "blocked" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "mark-complete: marks task as blocked"
    # Verify the task was updated with blocked marker
    if grep -q '\[!\] \*\*Task 1.1\*\*' "$tasks_file"; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} mark-complete: blocked marker correct"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} mark-complete: blocked marker incorrect"
    fi
}

test_mark_complete_incomplete() {
    create_story "mark-incomplete" "implement"
    create_tasks_with_checkboxes "mark-incomplete"
    local tasks_file="$TEST_TMPDIR/docs/stories/mark-incomplete/tasks.md"
    # First mark as complete, then back to incomplete
    "$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "1.1" "complete" 2>&1 </dev/null || true
    local output exit_code=0
    output=$("$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "1.1" "incomplete" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "mark-complete: marks task as incomplete"
    # Verify the task was reset
    if grep -q '\[ \] \*\*Task 1.1\*\*' "$tasks_file"; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} mark-complete: incomplete marker correct"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} mark-complete: incomplete marker incorrect"
    fi
}

#
# next-task.sh edge cases
#

create_tasks_with_dependencies() {
    local slug="$1"

    cat > "$TEST_TMPDIR/docs/stories/$slug/tasks.md" << 'MDEOF'
# Tasks

## Implementation Tasks

- [x] **Task 1.1**: First task (completed)
  - **Description**: Already done
  - **Files**: `src/first.ts`
  - **Done when**: Done

- [ ] **Task 1.2**: Second task (depends on 1.1)
  - **Description**: Needs first task
  - **Files**: `src/second.ts`
  - **Done when**: Done
  - **Depends on**: Task 1.1

- [ ] **Task 1.3**: Third task (depends on 1.2)
  - **Description**: Needs second task
  - **Files**: `src/third.ts`
  - **Done when**: Done
  - **Depends on**: Task 1.2

MDEOF
}

test_next_task_respects_dependencies() {
    create_story "next-deps" "implement"
    create_tasks_with_dependencies "next-deps"
    local tasks_file="$TEST_TMPDIR/docs/stories/next-deps/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: handles dependencies"
    # Should return task 1.2 (first incomplete with satisfied deps)
    if echo "$output" | jq -e '.id == "1.2"' >/dev/null 2>&1; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: returns task 1.2 (deps satisfied)"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: did not return task 1.2"
    fi
}

test_next_task_skips_blocked_deps() {
    create_story "next-blocked-deps" "implement"
    # Create tasks where 1.2 depends on incomplete 1.1
    cat > "$TEST_TMPDIR/docs/stories/next-blocked-deps/tasks.md" << 'MDEOF'
# Tasks

- [ ] **Task 1.1**: First task
  - **Done when**: Done

- [ ] **Task 1.2**: Second task
  - **Done when**: Done
  - **Depends on**: Task 1.1

- [ ] **Task 1.3**: Third task (no deps)
  - **Done when**: Done

MDEOF
    local tasks_file="$TEST_TMPDIR/docs/stories/next-blocked-deps/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: handles blocked deps"
    # Should return task 1.1 (first incomplete with no deps)
    if echo "$output" | jq -e '.id == "1.1"' >/dev/null 2>&1; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: returns task 1.1 (no deps)"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: did not return task 1.1"
    fi
}

test_next_task_all_complete() {
    create_story "next-complete" "implement"
    cat > "$TEST_TMPDIR/docs/stories/next-complete/tasks.md" << 'MDEOF'
# Tasks

- [x] **Task 1.1**: All done
  - **Done when**: Done
MDEOF
    local tasks_file="$TEST_TMPDIR/docs/stories/next-complete/tasks.md"
    local output exit_code=0
    output=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" 2>&1 </dev/null) || exit_code=$?
    assert_exit_code 0 "$exit_code" "next-task: works when all complete"
    # Should return empty when all tasks complete
    if [ -z "$output" ] || [ "$output" = "" ]; then
        ((TESTS_RUN++)) || true
        ((TESTS_PASSED++)) || true
        echo -e "${GREEN}[PASS]${NC} next-task: returns empty when all complete"
    else
        ((TESTS_RUN++)) || true
        ((TESTS_FAILED++)) || true
        echo -e "${RED}[FAIL]${NC} next-task: should return empty when all complete"
    fi
}

#
# validate-criteria.sh edge cases
#

test_validate_criteria_implement_incomplete_tasks() {
    create_story "impl-incomplete" "implement"
    create_design_doc "impl-incomplete"
    create_tasks_with_checkboxes "impl-incomplete"
    local output exit_code=0
    output=$("$SCRIPT_DIR/validate-criteria.sh" "implement" "impl-incomplete" 2>&1 </dev/null) || exit_code=$?
    # Should fail because tasks are incomplete
    assert_exit_code 1 "$exit_code" "validate-criteria: implement with incomplete tasks blocks"
}

#
# Main Test Runner
#

echo "=============================================="
echo "Verification Scripts Test Suite"
echo "=============================================="
echo ""

echo -e "${BLUE}━━━ Testing: phase-gate.sh ━━━${NC}"
run_test "phase-gate no workflow" test_phase_gate_no_workflow
run_test "phase-gate list empty" test_phase_gate_list_empty
run_test "phase-gate list with stories" test_phase_gate_list_with_stories
run_test "phase-gate prewrite understand" test_phase_gate_prewrite_understand_blocks
run_test "phase-gate prewrite research" test_phase_gate_prewrite_research_blocks
run_test "phase-gate prewrite implement" test_phase_gate_prewrite_implement_with_design
run_test "phase-gate prewrite implement no design" test_phase_gate_prewrite_implement_no_design
run_test "phase-gate prewrite scope" test_phase_gate_prewrite_scope_warns
run_test "phase-gate preconditions scope no research" test_phase_gate_preconditions_scope_no_research
run_test "phase-gate preconditions scope with research" test_phase_gate_preconditions_scope_with_research
echo ""

echo -e "${BLUE}━━━ Testing: validate-criteria.sh ━━━${NC}"
run_test "validate-criteria no workflow" test_validate_criteria_no_workflow
run_test "validate-criteria research no notes" test_validate_criteria_research_without_notes
run_test "validate-criteria research with notes" test_validate_criteria_research_with_notes
run_test "validate-criteria design no doc" test_validate_criteria_design_without_design_doc
run_test "validate-criteria design with doc" test_validate_criteria_design_with_doc
run_test "validate-criteria complete phase" test_validate_criteria_complete_phase
run_test "validate-criteria understand blocks" test_validate_criteria_understand_blocks
run_test "validate-criteria scope no research" test_validate_criteria_scope_without_research
run_test "validate-criteria scope with research" test_validate_criteria_scope_with_research
run_test "validate-criteria decompose no tasks" test_validate_criteria_decompose_without_tasks
run_test "validate-criteria decompose with tasks" test_validate_criteria_decompose_with_tasks
echo ""

echo -e "${BLUE}━━━ Testing: verify-requirements.sh ━━━${NC}"
run_test "verify-requirements clean" test_verify_requirements_clean
run_test "verify-requirements questions" test_verify_requirements_with_questions
run_test "verify-requirements blocked" test_verify_requirements_blocked
run_test "verify-requirements unresolved" test_verify_requirements_unresolved
run_test "verify-requirements no story" test_verify_requirements_no_story
echo ""

echo -e "${BLUE}━━━ Testing: detect-contradictions.sh ━━━${NC}"
run_test "detect-contradictions clean" test_detect_contradictions_clean
run_test "detect-contradictions explicit" test_detect_contradictions_explicit
run_test "detect-contradictions warnings" test_detect_contradictions_warnings
echo ""

echo -e "${BLUE}━━━ Testing: completion-check.sh ━━━${NC}"
run_test "completion-check no workflow" test_completion_check_no_workflow
run_test "completion-check complete" test_completion_check_complete
run_test "completion-check understand" test_completion_check_understand_blocks
run_test "completion-check implement" test_completion_check_implement_warns
run_test "completion-check research" test_completion_check_research_blocks
run_test "completion-check scope" test_completion_check_scope_blocks
run_test "completion-check design" test_completion_check_design_warns
run_test "completion-check decompose" test_completion_check_decompose_warns
run_test "completion-check validate" test_completion_check_validate_warns
echo ""

echo -e "${BLUE}━━━ Testing: run-validation.sh ━━━${NC}"
run_test "run-validation no project" test_run_validation_no_project
run_test "run-validation quick" test_run_validation_quick_mode
echo ""

echo -e "${BLUE}━━━ Testing: enforce-phase-transition.sh ━━━${NC}"
run_test "enforce non-workflow" test_enforce_non_workflow
run_test "enforce research->scope blocks" test_enforce_research_to_scope_blocks
run_test "enforce research->scope with notes" test_enforce_research_to_scope_with_notes
run_test "enforce scope->design" test_enforce_scope_to_design
run_test "enforce design->decompose blocks" test_enforce_design_to_decompose_blocks
run_test "enforce design->decompose with design" test_enforce_design_to_decompose_with_design
run_test "enforce decompose->implement blocks" test_enforce_decompose_to_implement_blocks
run_test "enforce decompose->implement with tasks" test_enforce_decompose_to_implement_with_tasks
run_test "enforce same phase allows" test_enforce_same_phase_allows
echo ""

echo -e "${BLUE}━━━ Testing: mark-complete.sh ━━━${NC}"
run_test "mark-complete no args" test_mark_complete_no_args
run_test "mark-complete missing file" test_mark_complete_missing_file
run_test "mark-complete task" test_mark_complete_task
run_test "mark-complete in_progress" test_mark_complete_in_progress
run_test "mark-complete nonexistent task" test_mark_complete_nonexistent_task
echo ""

echo -e "${BLUE}━━━ Testing: next-task.sh ━━━${NC}"
run_test "next-task no args" test_next_task_no_args
run_test "next-task missing file" test_next_task_missing_file
run_test "next-task returns first" test_next_task_returns_first_incomplete
run_test "next-task count" test_next_task_count
run_test "next-task all" test_next_task_all
run_test "next-task respects dependencies" test_next_task_respects_dependencies
run_test "next-task skips blocked deps" test_next_task_skips_blocked_deps
run_test "next-task all complete" test_next_task_all_complete
echo ""

echo -e "${BLUE}━━━ Testing: show-status.sh ━━━${NC}"
run_test "show-status no workflow" test_show_status_no_workflow
run_test "show-status with story" test_show_status_with_story
run_test "show-status compact" test_show_status_compact
run_test "show-status json" test_show_status_json
echo ""

echo -e "${BLUE}━━━ Testing: mark-complete.sh (edge cases) ━━━${NC}"
run_test "mark-complete blocked" test_mark_complete_blocked
run_test "mark-complete incomplete" test_mark_complete_incomplete
echo ""

echo -e "${BLUE}━━━ Testing: validate-criteria.sh (edge cases) ━━━${NC}"
run_test "validate-criteria implement incomplete" test_validate_criteria_implement_incomplete_tasks
echo ""

#
# Summary
#

echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo -e "Total:  ${TESTS_RUN}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}SOME TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}ALL TESTS PASSED${NC}"
    exit 0
fi
