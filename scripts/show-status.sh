#!/bin/bash
#
# Workflow Status Display
#
# Shows the current workflow state in a clear, visual format.
# Can be called from any script or used standalone.
#
# Usage:
#   ./show-status.sh                    # Show status for most recent story
#   ./show-status.sh [story-slug]       # Show status for specific story
#   ./show-status.sh --compact          # One-line compact output
#   ./show-status.sh --json             # JSON output for programmatic use
#
# Environment Variables:
#   NO_COLOR=1    Disable colored output
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORIES_DIR="docs/stories"

# Colors (disabled if NO_COLOR is set)
if [ -z "$NO_COLOR" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    MAGENTA='\033[0;35m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' BOLD='' DIM='' NC=''
fi

# Phase metadata (bash 3 compatible)
PHASES_ORDERED="understand research scope design decompose implement validate deploy"

# Get phase number (1-8)
get_phase_num() {
    local phase="$1"
    case "$phase" in
        understand)  echo "1" ;;
        research)    echo "2" ;;
        scope)       echo "3" ;;
        design)      echo "4" ;;
        decompose)   echo "5" ;;
        implement)   echo "6" ;;
        validate)    echo "7" ;;
        deploy)      echo "8" ;;
        *)           echo "?" ;;
    esac
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

# Get task statistics from tasks.md
get_task_stats() {
    local tasks_file="$1"

    if [ ! -f "$tasks_file" ]; then
        echo "0 0 0 0"
        return
    fi

    local total=0
    local complete=0
    local in_progress=0
    local blocked=0

    while IFS= read -r line; do
        if [[ "$line" =~ \[x\].*Task ]]; then
            ((complete++)) || true
            ((total++)) || true
        elif [[ "$line" =~ \[~\].*Task ]]; then
            ((in_progress++)) || true
            ((total++)) || true
        elif [[ "$line" =~ \[!\].*Task ]]; then
            ((blocked++)) || true
            ((total++)) || true
        elif [[ "$line" =~ \[[[:space:]]\].*Task ]]; then
            ((total++)) || true
        fi
    done < "$tasks_file"

    echo "$total $complete $in_progress $blocked"
}

# Build phase progress indicator
build_phase_progress() {
    local current_phase="$1"
    local completed_phases="$2"
    local output=""

    for phase in $PHASES_ORDERED; do
        local num
        num=$(get_phase_num "$phase")

        if echo "$completed_phases" | grep -q "\"$phase\""; then
            # Completed phase
            output="${output}${GREEN}${num}${NC} "
        elif [ "$phase" = "$current_phase" ]; then
            # Current phase (highlighted)
            output="${output}${BOLD}${CYAN}[${num}]${NC} "
        else
            # Future phase
            output="${output}${DIM}${num}${NC} "
        fi
    done

    echo -e "$output"
}

# Compact one-line status
show_compact() {
    local story_dir="$1"
    local state_file="$story_dir/workflow-state.json"

    if [ ! -f "$state_file" ]; then
        echo "No active workflow"
        return
    fi

    local slug current_phase phase_num
    slug=$(jq -r '.slug // "unknown"' "$state_file")
    current_phase=$(jq -r '.currentPhase // "unknown"' "$state_file")
    phase_num=$(get_phase_num "$current_phase")

    # Get task stats if in implement phase
    local task_info=""
    if [ "$current_phase" = "implement" ] && [ -f "$story_dir/tasks.md" ]; then
        read -r total complete in_progress blocked <<< "$(get_task_stats "$story_dir/tasks.md")"
        if [ "$total" -gt 0 ]; then
            task_info=" | Tasks: ${complete}/${total}"
            [ "$in_progress" -gt 0 ] && task_info+=" (${in_progress} active)"
        fi
    fi

    echo -e "${CYAN}${slug}${NC} | Phase ${phase_num}/8: ${BOLD}${current_phase}${NC}${task_info}"
}

# JSON output
show_json() {
    local story_dir="$1"
    local state_file="$story_dir/workflow-state.json"

    if [ ! -f "$state_file" ]; then
        echo '{"error": "No active workflow"}'
        return
    fi

    local tasks_file="$story_dir/tasks.md"
    read -r total complete in_progress blocked <<< "$(get_task_stats "$tasks_file")"

    # Read and augment the state file
    jq --argjson total "$total" \
       --argjson complete "$complete" \
       --argjson in_progress "$in_progress" \
       --argjson blocked "$blocked" \
       '. + {tasks: {total: $total, complete: $complete, in_progress: $in_progress, blocked: $blocked}}' \
       "$state_file"
}

# Full status display
show_full() {
    local story_dir="$1"
    local state_file="$story_dir/workflow-state.json"

    if [ ! -f "$state_file" ]; then
        echo -e "${YELLOW}No active workflow found.${NC}"
        echo "Start one with: /engineering-process:story \"your story description\""
        return
    fi

    # Read state
    local story slug current_phase started_at completed_phases jtbd_job
    story=$(jq -r '.story // "unknown"' "$state_file")
    slug=$(jq -r '.slug // "unknown"' "$state_file")
    current_phase=$(jq -r '.currentPhase // "unknown"' "$state_file")
    started_at=$(jq -r '.startedAt // ""' "$state_file")
    completed_phases=$(jq -c '.completedPhases // []' "$state_file")
    jtbd_job=$(jq -r '.jtbd.job // ""' "$state_file")

    local phase_num
    phase_num=$(get_phase_num "$current_phase")
    local completed_count
    completed_count=$(echo "$completed_phases" | jq 'length')

    # Build the display
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  WORKFLOW STATUS${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${DIM}Story:${NC}  ${BOLD}$slug${NC}"
    [ -n "$jtbd_job" ] && echo -e "  ${DIM}Goal:${NC}   $jtbd_job"
    echo ""
    echo -e "  ${DIM}Phase:${NC}  ${BOLD}${CYAN}$current_phase${NC} ${DIM}(${phase_num}/8)${NC}"
    echo ""
    echo -e "  ${DIM}Progress:${NC} $(build_phase_progress "$current_phase" "$completed_phases")"
    echo -e "            ${DIM}1=understand 2=research 3=scope 4=design 5=decompose 6=implement 7=validate 8=deploy${NC}"

    # Show task progress if in implement phase
    if [ "$current_phase" = "implement" ] && [ -f "$story_dir/tasks.md" ]; then
        read -r total complete in_progress blocked <<< "$(get_task_stats "$story_dir/tasks.md")"

        if [ "$total" -gt 0 ]; then
            echo ""
            echo -e "  ${DIM}Tasks:${NC}"

            # Progress bar
            local bar_width=40
            local filled=$((complete * bar_width / total))
            local empty=$((bar_width - filled))
            local bar="${GREEN}"
            for ((i=0; i<filled; i++)); do bar+="█"; done
            bar+="${DIM}"
            for ((i=0; i<empty; i++)); do bar+="░"; done
            bar+="${NC}"

            local percent=$((complete * 100 / total))
            echo -e "          $bar ${BOLD}${percent}%${NC}"
            echo -e "          ${GREEN}$complete${NC} complete, ${YELLOW}$in_progress${NC} active, ${DIM}$((total - complete - in_progress))${NC} remaining"
            [ "$blocked" -gt 0 ] && echo -e "          ${RED}$blocked blocked${NC}"
        fi
    fi

    # Show artifact status
    echo ""
    echo -e "  ${DIM}Artifacts:${NC}"
    [ -f "$story_dir/research-notes.md" ] && echo -e "          ${GREEN}✓${NC} research-notes.md" || echo -e "          ${DIM}○${NC} research-notes.md"
    [ -f "$story_dir/design.md" ] && echo -e "          ${GREEN}✓${NC} design.md" || echo -e "          ${DIM}○${NC} design.md"
    [ -f "$story_dir/tasks.md" ] && echo -e "          ${GREEN}✓${NC} tasks.md" || echo -e "          ${DIM}○${NC} tasks.md"

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Main
main() {
    local mode="full"
    local story_slug=""

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --compact|-c)
                mode="compact"
                shift
                ;;
            --json|-j)
                mode="json"
                shift
                ;;
            -h|--help)
                cat <<EOF
Workflow Status Display

Usage:
  ./show-status.sh                    Show full status for most recent story
  ./show-status.sh [story-slug]       Show status for specific story
  ./show-status.sh --compact          One-line compact output
  ./show-status.sh --json             JSON output for programmatic use

Environment Variables:
  NO_COLOR=1    Disable colored output

Examples:
  ./show-status.sh                    # Full status display
  ./show-status.sh -c                 # Quick one-liner
  ./show-status.sh add-auth --json    # JSON for specific story
EOF
                exit 0
                ;;
            *)
                story_slug="$1"
                shift
                ;;
        esac
    done

    local story_dir
    story_dir=$(find_story_dir "$story_slug")

    if [ -z "$story_dir" ]; then
        if [ "$mode" = "json" ]; then
            echo '{"error": "No story directory found"}'
        else
            echo -e "${YELLOW}No active workflow found.${NC}"
            echo "Start one with: /engineering-process:story \"your story description\""
        fi
        exit 1
    fi

    case "$mode" in
        compact) show_compact "$story_dir" ;;
        json) show_json "$story_dir" ;;
        full) show_full "$story_dir" ;;
    esac
}

main "$@"
