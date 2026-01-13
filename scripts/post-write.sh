#!/bin/bash
#
# Post-Write Hook Script
# Runs after file write/edit operations
#
# Provides downstream backpressure per WIGGUM.md:
#   "Tests, type checks, and lints provide backpressure validation gates"
#
# This script:
# - Detects workflow artifact writes (research-notes.md, design.md, tasks.md)
# - Invokes phase transition validation
# - Provides immediate feedback on phase completion criteria
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read hook input from stdin
if [ -t 0 ]; then
    INPUT=""
else
    INPUT=$(cat)
fi

# Extract file path from hook input (if available)
FILE_PATH=""
if [ -n "$INPUT" ]; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
fi

# Skip if no file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Check if this is a workflow artifact that needs validation
is_workflow_artifact() {
    local file="$1"
    case "$file" in
        */workflow-state.json|*/research-notes.md|*/design.md|*/tasks.md)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Run phase transition validation for workflow artifacts
# This provides immediate feedback on phase completion criteria
if is_workflow_artifact "$FILE_PATH"; then
    # Try to find check-phase-transition.sh in:
    # 1. Same directory as this script
    # 2. Project's .claude/hooks directory
    VALIDATOR=""
    if [ -x "$SCRIPT_DIR/check-phase-transition.sh" ]; then
        VALIDATOR="$SCRIPT_DIR/check-phase-transition.sh"
    elif [ -x ".claude/hooks/check-phase-transition.sh" ]; then
        VALIDATOR=".claude/hooks/check-phase-transition.sh"
    fi

    if [ -n "$VALIDATOR" ]; then
        # Pass file path to validator - it will check completion criteria
        # and provide feedback (but not block writes)
        echo "$FILE_PATH" | "$VALIDATOR" 2>&1 || true
    fi
fi

# Get file extension for optional formatting
EXTENSION="${FILE_PATH##*.}"

# Optional: Run formatters based on file type
# Uncomment and customize as needed

# case "$EXTENSION" in
#     "ts"|"tsx"|"js"|"jsx")
#         # Run Prettier for TypeScript/JavaScript
#         if command -v npx &> /dev/null && [ -f "package.json" ]; then
#             npx prettier --write "$FILE_PATH" 2>/dev/null || true
#         fi
#         ;;
#     "py")
#         # Run Black for Python
#         if command -v black &> /dev/null; then
#             black "$FILE_PATH" 2>/dev/null || true
#         fi
#         ;;
#     "go")
#         # Run gofmt for Go
#         if command -v gofmt &> /dev/null; then
#             gofmt -w "$FILE_PATH" 2>/dev/null || true
#         fi
#         ;;
#     "rs")
#         # Run rustfmt for Rust
#         if command -v rustfmt &> /dev/null; then
#             rustfmt "$FILE_PATH" 2>/dev/null || true
#         fi
#         ;;
# esac

# Log the write operation (optional)
# echo "[$(date -Iseconds)] Modified: $FILE_PATH" >> .claude/write-log.txt

# Success - PostToolUse hooks should not block
exit 0
