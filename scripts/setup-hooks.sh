#!/usr/bin/env bash
#
# setup-hooks.sh - Automated hook installation for claude-engineering-process plugin
#
# This script installs the validation hooks and scripts required by the
# engineering-process plugin into the target project.
#
# Usage: ./setup-hooks.sh [--check] [--uninstall]
#
# Options:
#   --check      Check if hooks are properly installed (exit 0 if yes, 1 if no)
#   --uninstall  Remove installed hooks and scripts
#   (no args)    Install hooks to current project
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script lives (the plugin's scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"

# Target project directory (current working directory)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TARGET_HOOKS_DIR="$PROJECT_DIR/.claude/hooks"

# Scripts that need to be installed for hooks to work
REQUIRED_SCRIPTS=(
    "phase-gate.sh"
    "post-write.sh"
    "completion-check.sh"
    "check-phase-transition.sh"
    "validate-criteria.sh"
    "quick-verification.sh"
    # Enforcement scripts (ensure verification runs automatically)
    "enforce-phase-transition.sh"
    "on-implementer-stop.sh"
    "on-validator-stop.sh"
    "on-requirements-verified.sh"
)

# Optional verification scripts (not required but recommended)
OPTIONAL_SCRIPTS=(
    "verify-requirements.sh"
    "detect-contradictions.sh"
    "run-mutation-tests.sh"
    "run-fuzzer.sh"
    "run-validation.sh"
)

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed."
        echo ""
        echo "Install jq:"
        echo "  macOS:    brew install jq"
        echo "  Ubuntu:   sudo apt-get install jq"
        echo "  Windows:  choco install jq"
        echo ""
        return 1
    fi
    return 0
}

# Check if hooks are installed
check_installation() {
    local all_installed=true
    local missing_scripts=()

    # Check if hooks directory exists
    if [[ ! -d "$TARGET_HOOKS_DIR" ]]; then
        print_warning "Hooks directory does not exist: $TARGET_HOOKS_DIR"
        all_installed=false
    else
        # Check each required script
        for script in "${REQUIRED_SCRIPTS[@]}"; do
            if [[ ! -f "$TARGET_HOOKS_DIR/$script" ]]; then
                missing_scripts+=("$script")
                all_installed=false
            elif [[ ! -x "$TARGET_HOOKS_DIR/$script" ]]; then
                print_warning "$script exists but is not executable"
                all_installed=false
            fi
        done
    fi

    if $all_installed; then
        print_success "All required hooks are installed"
        return 0
    else
        if [[ ${#missing_scripts[@]} -gt 0 ]]; then
            print_error "Missing scripts: ${missing_scripts[*]}"
        fi
        return 1
    fi
}

# Install hooks to the target project
install_hooks() {
    print_header "Installing Engineering Process Hooks"

    echo "Plugin directory: $PLUGIN_DIR"
    echo "Target project:   $PROJECT_DIR"
    echo ""

    # Check for jq dependency
    if ! check_jq; then
        return 1
    fi

    # Create hooks directory
    if [[ ! -d "$TARGET_HOOKS_DIR" ]]; then
        print_info "Creating hooks directory: $TARGET_HOOKS_DIR"
        mkdir -p "$TARGET_HOOKS_DIR"
        print_success "Created $TARGET_HOOKS_DIR"
    else
        print_info "Hooks directory already exists"
    fi

    echo ""
    echo "Installing required scripts..."
    echo ""

    local installed_count=0
    local updated_count=0

    # Copy required scripts
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        local source="$SCRIPT_DIR/$script"
        local target="$TARGET_HOOKS_DIR/$script"

        if [[ ! -f "$source" ]]; then
            print_error "Source script not found: $source"
            continue
        fi

        if [[ -f "$target" ]]; then
            # Compare checksums to see if update is needed
            local source_sum target_sum
            source_sum=$(shasum "$source" 2>/dev/null | cut -d' ' -f1)
            target_sum=$(shasum "$target" 2>/dev/null | cut -d' ' -f1)

            if [[ "$source_sum" == "$target_sum" ]]; then
                print_info "$script (already up to date)"
            else
                cp "$source" "$target"
                chmod +x "$target"
                print_success "$script (updated)"
                ((updated_count++))
            fi
        else
            cp "$source" "$target"
            chmod +x "$target"
            print_success "$script (installed)"
            ((installed_count++))
        fi
    done

    echo ""
    echo "Installing optional verification scripts..."
    echo ""

    # Copy optional scripts
    for script in "${OPTIONAL_SCRIPTS[@]}"; do
        local source="$SCRIPT_DIR/$script"
        local target="$TARGET_HOOKS_DIR/$script"

        if [[ ! -f "$source" ]]; then
            print_warning "$script not found in plugin (skipping)"
            continue
        fi

        if [[ -f "$target" ]]; then
            local source_sum target_sum
            source_sum=$(shasum "$source" 2>/dev/null | cut -d' ' -f1)
            target_sum=$(shasum "$target" 2>/dev/null | cut -d' ' -f1)

            if [[ "$source_sum" == "$target_sum" ]]; then
                print_info "$script (already up to date)"
            else
                cp "$source" "$target"
                chmod +x "$target"
                print_success "$script (updated)"
                ((updated_count++))
            fi
        else
            cp "$source" "$target"
            chmod +x "$target"
            print_success "$script (installed)"
            ((installed_count++))
        fi
    done

    echo ""
    print_header "Installation Complete"

    echo "Summary:"
    echo "  - New scripts installed: $installed_count"
    echo "  - Scripts updated:       $updated_count"
    echo ""

    # Verify installation
    if check_installation; then
        echo ""
        print_success "Hooks are ready to use!"
        echo ""
        echo "The following hooks are now active:"
        echo "  • PreToolUse   → phase-gate.sh (validates before file changes)"
        echo "  • PreToolUse   → enforce-phase-transition.sh (blocks phase changes until verification passes)"
        echo "  • PostToolUse  → post-write.sh (downstream backpressure)"
        echo "  • PostToolUse  → quick-verification.sh (fast verification layer)"
        echo "  • SubagentStop → on-implementer-stop.sh (runs full validation when implementer finishes)"
        echo "  • SubagentStop → on-validator-stop.sh (runs mutation/fuzzing when validator finishes)"
        echo "  • SubagentStop → on-requirements-verified.sh (enforces requirements verification)"
        echo "  • Stop         → completion-check.sh (phase completion check)"
        echo ""
        echo "Verification is now ENFORCED - it runs automatically, not by agent choice."
        echo ""
        echo "See hooks/SETUP.md in the plugin for more details."
    else
        print_warning "Installation may be incomplete. Run with --check to verify."
    fi

    return 0
}

# Uninstall hooks from the target project
uninstall_hooks() {
    print_header "Uninstalling Engineering Process Hooks"

    echo "Target project: $PROJECT_DIR"
    echo ""

    if [[ ! -d "$TARGET_HOOKS_DIR" ]]; then
        print_info "No hooks directory found. Nothing to uninstall."
        return 0
    fi

    local removed_count=0

    # Remove all installed scripts
    for script in "${REQUIRED_SCRIPTS[@]}" "${OPTIONAL_SCRIPTS[@]}"; do
        local target="$TARGET_HOOKS_DIR/$script"
        if [[ -f "$target" ]]; then
            rm "$target"
            print_success "Removed $script"
            ((removed_count++))
        fi
    done

    # Remove hooks directory if empty
    if [[ -d "$TARGET_HOOKS_DIR" ]] && [[ -z "$(ls -A "$TARGET_HOOKS_DIR" 2>/dev/null)" ]]; then
        rmdir "$TARGET_HOOKS_DIR"
        print_success "Removed empty hooks directory"

        # Also remove .claude directory if empty
        local claude_dir="$PROJECT_DIR/.claude"
        if [[ -d "$claude_dir" ]] && [[ -z "$(ls -A "$claude_dir" 2>/dev/null)" ]]; then
            rmdir "$claude_dir"
            print_success "Removed empty .claude directory"
        fi
    fi

    echo ""
    print_header "Uninstallation Complete"
    echo "Removed $removed_count script(s)"

    return 0
}

# Show usage information
show_usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo ""
    echo "Automated hook installation for the claude-engineering-process plugin."
    echo ""
    echo "Options:"
    echo "  --check      Check if hooks are properly installed"
    echo "  --uninstall  Remove installed hooks and scripts"
    echo "  --help       Show this help message"
    echo "  (no args)    Install hooks to current project"
    echo ""
    echo "Environment:"
    echo "  CLAUDE_PROJECT_DIR  Target project directory (default: current directory)"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0")              # Install hooks"
    echo "  $(basename "$0") --check      # Verify installation"
    echo "  $(basename "$0") --uninstall  # Remove hooks"
}

# Main entry point
main() {
    case "${1:-}" in
        --check)
            check_installation
            ;;
        --uninstall)
            uninstall_hooks
            ;;
        --help|-h)
            show_usage
            ;;
        "")
            install_hooks
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
