#!/bin/bash
#
# Autonomous Loop Orchestrator (Ralph Wiggum Style)
#
# This script implements the "Ralph Playbook" pattern for autonomous AI-assisted
# development. Each iteration:
#   1. Spawns a fresh Claude context (avoiding context pollution)
#   2. Loads only the task file and relevant context
#   3. Executes ONE task
#   4. Runs validation (tests/lint as backpressure)
#   5. Updates task status
#   6. Loops until complete
#
# Usage:
#   ./loop.sh [story-slug]
#   ./loop.sh                    # Uses most recent story
#   ./loop.sh add-authentication # Uses specific story
#
# Environment Variables:
#   CLAUDE_BIN      - Path to Claude CLI (default: claude)
#   SKIP_VALIDATION - Set to 1 to skip test/lint validation
#   DRY_RUN         - Set to 1 to print commands without executing
#   MAX_ITERATIONS  - Maximum loop iterations (default: 50, safety limit)
#   CONTEXT_FILES   - Additional files to include (space-separated)
#
# The "Ralph Insight": Fresh context + tight task scope = maximum "smart zone" utilization
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORIES_DIR="docs/stories"

# Configuration
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_VALIDATION="${SKIP_VALIDATION:-0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Timing
START_TIME=$(date +%s)
TASK_TIMES=()

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_task() { echo -e "${CYAN}[TASK]${NC} $1"; }

# Progress bar helper
draw_progress_bar() {
    local current=$1
    local total=$2
    local width=${3:-40}
    local label=${4:-"Progress"}

    if [ "$total" -eq 0 ]; then
        return
    fi

    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    local bar="${GREEN}"
    for ((i=0; i<filled; i++)); do bar+="█"; done
    bar+="${DIM}"
    for ((i=0; i<empty; i++)); do bar+="░"; done
    bar+="${NC}"

    echo -e "  ${label}: $bar ${BOLD}${percent}%${NC} (${current}/${total})"
}

# Format duration
format_duration() {
    local seconds=$1
    if [ "$seconds" -lt 60 ]; then
        echo "${seconds}s"
    elif [ "$seconds" -lt 3600 ]; then
        echo "$((seconds / 60))m $((seconds % 60))s"
    else
        echo "$((seconds / 3600))h $((seconds % 3600 / 60))m"
    fi
}

# Calculate ETA based on average task time
calculate_eta() {
    local remaining=$1

    if [ ${#TASK_TIMES[@]} -eq 0 ]; then
        echo "calculating..."
        return
    fi

    local sum=0
    for t in "${TASK_TIMES[@]}"; do
        sum=$((sum + t))
    done
    local avg=$((sum / ${#TASK_TIMES[@]}))
    local eta=$((avg * remaining))

    format_duration "$eta"
}

# Show iteration header with progress
show_iteration_header() {
    local iteration=$1
    local total_tasks=$2
    local completed=$3
    local task_title=$4
    local task_id=$5

    local remaining=$((total_tasks - completed))
    local elapsed=$(($(date +%s) - START_TIME))

    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║${NC}  ${CYAN}ITERATION ${iteration}/${MAX_ITERATIONS}${NC}                                                         ${BOLD}║${NC}"
    echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    draw_progress_bar "$completed" "$total_tasks" 50 "  Tasks   "
    echo -e "  ${DIM}Elapsed:${NC} $(format_duration $elapsed)  ${DIM}|${NC}  ${DIM}ETA:${NC} $(calculate_eta $remaining)  ${DIM}|${NC}  ${DIM}Remaining:${NC} ${remaining} tasks"
    echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║${NC}  ${YELLOW}▶ Task ${task_id}:${NC} ${task_title:0:58}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Show final summary
show_final_summary() {
    local iteration=$1
    local completed=$2
    local failed=$3
    local total_tasks=$4
    local remaining=$5

    local elapsed=$(($(date +%s) - START_TIME))
    local avg_time=0
    if [ ${#TASK_TIMES[@]} -gt 0 ]; then
        local sum=0
        for t in "${TASK_TIMES[@]}"; do sum=$((sum + t)); done
        avg_time=$((sum / ${#TASK_TIMES[@]}))
    fi

    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║${NC}  ${CYAN}LOOP COMPLETE${NC}                                                               ${BOLD}║${NC}"
    echo -e "${BOLD}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"
    draw_progress_bar "$completed" "$total_tasks" 50 "  Final   "
    echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}  ${DIM}Statistics:${NC}                                                                 ${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}    Iterations run:    ${iteration}                                                     ${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}    Tasks completed:   ${GREEN}${completed}${NC}                                                      ${BOLD}║${NC}"
    [ "$failed" -gt 0 ] && echo -e "${BOLD}║${NC}    Tasks failed:      ${RED}${failed}${NC}                                                       ${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}    Total time:        $(format_duration $elapsed)                                              ${BOLD}║${NC}"
    [ "$avg_time" -gt 0 ] && echo -e "${BOLD}║${NC}    Avg time/task:     $(format_duration $avg_time)                                              ${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"

    if [ "$remaining" = "0" ]; then
        echo -e "${BOLD}║${NC}  ${GREEN}✓ All tasks completed!${NC}                                                      ${BOLD}║${NC}"
        echo -e "${BOLD}║${NC}  ${DIM}Run '/engineering-process:phase validate' to proceed.${NC}                       ${BOLD}║${NC}"
    else
        echo -e "${BOLD}║${NC}  ${YELLOW}⚠ ${remaining} tasks remaining${NC}                                                       ${BOLD}║${NC}"
    fi
    echo -e "${BOLD}║${NC}                                                                              ${BOLD}║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Get total task count
get_task_count() {
    local tasks_file="$1"
    "$SCRIPT_DIR/next-task.sh" "$tasks_file" --all 2>/dev/null | jq 'length' 2>/dev/null || echo "0"
}

# Get completed task count
get_completed_count() {
    local tasks_file="$1"
    "$SCRIPT_DIR/next-task.sh" "$tasks_file" --all 2>/dev/null | jq '[.[] | select(.status == "complete")] | length' 2>/dev/null || echo "0"
}

# Find story directory
find_story_dir() {
    local slug="$1"

    if [ -n "$slug" ] && [ -d "$STORIES_DIR/$slug" ]; then
        echo "$STORIES_DIR/$slug"
        return
    fi

    # Find most recently modified story
    if [ -d "$STORIES_DIR" ]; then
        local latest
        latest=$(find "$STORIES_DIR" -name "workflow-state.json" -type f 2>/dev/null | \
            xargs ls -t 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            dirname "$latest"
            return
        fi
    fi

    echo ""
}

# Check if we're in the implement phase
check_implement_phase() {
    local state_file="$1"
    local phase
    phase=$(jq -r '.currentPhase // "unknown"' "$state_file" 2>/dev/null)

    if [ "$phase" != "implement" ]; then
        log_error "Current phase is '$phase', not 'implement'"
        log_info "The autonomous loop runs during the implement phase."
        log_info "Use '/engineering-process:phase implement' to enter implementation."
        return 1
    fi
    return 0
}

# Build the prompt for Claude
build_prompt() {
    local task_id="$1"
    local task_title="$2"
    local task_description="$3"
    local task_files="$4"
    local task_criteria="$5"
    local story_dir="$6"

    # Read context files if they exist
    local tasks_content=""
    local design_content=""
    local research_content=""
    local additional_content=""

    if [ -f "$story_dir/tasks.md" ]; then
        tasks_content=$(cat "$story_dir/tasks.md")
    fi
    if [ -f "$story_dir/design.md" ]; then
        design_content=$(cat "$story_dir/design.md")
    fi
    if [ -f "$story_dir/research-notes.md" ]; then
        research_content=$(cat "$story_dir/research-notes.md")
    fi

    # Add any additional context files from CONTEXT_FILES env var
    if [ -n "$CONTEXT_FILES" ]; then
        for cf in $CONTEXT_FILES; do
            if [ -f "$cf" ]; then
                additional_content+="
### File: $cf
\`\`\`
$(cat "$cf")
\`\`\`
"
            fi
        done
    fi

    cat <<EOF
# Autonomous Implementation Task

You are executing a single task from an implementation plan. Focus ONLY on this task.

## Current Task: $task_id - $task_title

**Description:**
$task_description

**Files to modify:**
$task_files

**Completion Criteria:**
$task_criteria

## Instructions

1. Implement ONLY what this task requires - no more, no less
2. Write tests FIRST if the task involves new functionality (TDD)
3. Ensure all existing tests still pass
4. When complete, the task criteria above should all be satisfied

## Context

### Task Breakdown ($story_dir/tasks.md)
\`\`\`markdown
$tasks_content
\`\`\`

${design_content:+### Design Document ($story_dir/design.md)
\`\`\`markdown
$design_content
\`\`\`
}
${research_content:+### Research Notes ($story_dir/research-notes.md)
\`\`\`markdown
$research_content
\`\`\`
}
${additional_content:+### Additional Context Files
$additional_content
}
## After Completion

When you've completed the task:
1. Verify the completion criteria are met
2. Run any relevant tests
3. Summarize what was done

Do NOT move on to other tasks. Focus exclusively on: **$task_title**
EOF
}

# Main loop
main() {
    local story_slug="$1"
    local story_dir
    story_dir=$(find_story_dir "$story_slug")

    if [ -z "$story_dir" ] || [ ! -d "$story_dir" ]; then
        log_error "No story found. Start a workflow with '/engineering-process:story'"
        exit 1
    fi

    local state_file="$story_dir/workflow-state.json"
    local tasks_file="$story_dir/tasks.md"

    if [ ! -f "$state_file" ]; then
        log_error "Workflow state not found: $state_file"
        exit 1
    fi

    if [ ! -f "$tasks_file" ]; then
        log_error "Tasks file not found: $tasks_file"
        log_info "Complete the decompose phase to generate tasks."
        exit 1
    fi

    # Verify we're in implement phase
    if ! check_implement_phase "$state_file"; then
        exit 1
    fi

    local story_name
    story_name=$(jq -r '.story // "unknown"' "$state_file")
    local slug
    slug=$(jq -r '.slug // "unknown"' "$state_file")

    # Get initial task counts
    local total_tasks
    total_tasks=$(get_task_count "$tasks_file")

    # Show initial status using show-status.sh
    if [ -x "$SCRIPT_DIR/show-status.sh" ]; then
        "$SCRIPT_DIR/show-status.sh" "$slug" 2>/dev/null || true
    fi

    echo -e "${BOLD}Starting autonomous implementation loop...${NC}"
    echo -e "  ${DIM}Story:${NC}          $story_name"
    echo -e "  ${DIM}Directory:${NC}      $story_dir"
    echo -e "  ${DIM}Total tasks:${NC}    $total_tasks"
    echo -e "  ${DIM}Max iterations:${NC} $MAX_ITERATIONS"
    echo ""

    local iteration=0
    local completed=0
    local failed=0

    while [ $iteration -lt $MAX_ITERATIONS ]; do
        iteration=$((iteration + 1))

        # Get current task counts for progress display
        local current_completed
        current_completed=$(get_completed_count "$tasks_file")

        # Get next task
        local next_task
        next_task=$("$SCRIPT_DIR/next-task.sh" "$tasks_file")

        if [ -z "$next_task" ] || [ "$next_task" = "null" ]; then
            log_success "All tasks completed!"
            break
        fi

        # Parse task JSON
        local task_id task_title task_description task_files task_criteria
        task_id=$(echo "$next_task" | jq -r '.id // "unknown"')
        task_title=$(echo "$next_task" | jq -r '.title // "unknown"')
        task_description=$(echo "$next_task" | jq -r '.description // ""')
        task_files=$(echo "$next_task" | jq -r '.files // ""')
        task_criteria=$(echo "$next_task" | jq -r '.criteria // ""')

        # Show iteration header with progress
        show_iteration_header "$iteration" "$total_tasks" "$current_completed" "$task_title" "$task_id"

        # Start timing this task
        local task_start_time
        task_start_time=$(date +%s)

        # Mark task as in-progress
        "$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "$task_id" "in_progress"

        # Build prompt (now includes context files embedded directly)
        local prompt
        prompt=$(build_prompt "$task_id" "$task_title" "$task_description" "$task_files" "$task_criteria" "$story_dir")

        if [ "$DRY_RUN" = "1" ]; then
            log_info "[DRY RUN] Would execute:"
            echo "$CLAUDE_BIN -p \"[prompt with embedded context]\""
            "$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "$task_id" "complete"
            completed=$((completed + 1))
            continue
        fi

        # Execute Claude with fresh context
        # Using -p flag for non-interactive mode with the prompt containing all context
        log_info "Spawning fresh Claude context..."

        if $CLAUDE_BIN -p "$prompt"; then
            log_success "Task execution completed"

            # Run validation if not skipped
            if [ "$SKIP_VALIDATION" != "1" ]; then
                log_info "Running validation..."
                if "$SCRIPT_DIR/run-validation.sh"; then
                    log_success "Validation passed"
                    "$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "$task_id" "complete"
                    completed=$((completed + 1))

                    # Record task timing for ETA calculation
                    local task_end_time task_duration
                    task_end_time=$(date +%s)
                    task_duration=$((task_end_time - task_start_time))
                    TASK_TIMES+=("$task_duration")
                    echo -e "  ${DIM}Task completed in $(format_duration $task_duration)${NC}"
                else
                    log_error "Validation failed - task remains in progress"
                    log_warn "Fix the issues and re-run the loop"
                    failed=$((failed + 1))
                    # Don't mark complete, leave as in_progress for retry
                fi
            else
                log_warn "Validation skipped (SKIP_VALIDATION=1)"
                "$SCRIPT_DIR/mark-complete.sh" "$tasks_file" "$task_id" "complete"
                completed=$((completed + 1))

                # Record task timing
                local task_end_time task_duration
                task_end_time=$(date +%s)
                task_duration=$((task_end_time - task_start_time))
                TASK_TIMES+=("$task_duration")
            fi
        else
            log_error "Task execution failed"
            failed=$((failed + 1))
            # Leave task as in_progress
        fi

        # Brief pause between iterations
        sleep 1
    done

    # Check remaining tasks
    local remaining
    remaining=$("$SCRIPT_DIR/next-task.sh" "$tasks_file" --count 2>/dev/null || echo "0")

    # Show final summary
    show_final_summary "$iteration" "$completed" "$failed" "$total_tasks" "$remaining"
}

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    cat <<EOF
Autonomous Loop Orchestrator (Ralph Wiggum Style)

Usage:
  ./loop.sh [story-slug]

Options:
  -h, --help    Show this help

Environment Variables:
  CLAUDE_BIN      Path to Claude CLI (default: claude)
  SKIP_VALIDATION Set to 1 to skip test/lint validation
  DRY_RUN         Set to 1 to print commands without executing
  MAX_ITERATIONS  Maximum loop iterations (default: 50)
  CONTEXT_FILES   Additional files to include (space-separated)

Examples:
  ./loop.sh                           # Run on most recent story
  ./loop.sh add-authentication        # Run on specific story
  DRY_RUN=1 ./loop.sh                 # Preview without executing
  SKIP_VALIDATION=1 ./loop.sh         # Skip tests between tasks
  MAX_ITERATIONS=10 ./loop.sh         # Limit to 10 tasks

The Loop Pattern:
  1. Fresh context window (avoid pollution)
  2. Load ONLY task file + relevant context
  3. Execute ONE task
  4. Run validation (backpressure)
  5. Update task status
  6. Repeat
EOF
    exit 0
fi

main "$1"
