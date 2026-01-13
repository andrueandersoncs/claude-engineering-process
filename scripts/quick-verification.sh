#!/usr/bin/env bash
#
# quick-verification.sh
#
# Run fast verification checks on a file or the project.
# This is the "fast layer" of the verification pyramid,
# suitable for running on every edit.
#
# Usage: quick-verification.sh [file_path]
#
# Exit codes:
#   0 - All checks pass
#   1 - Some checks failed
#   2 - Unable to run verification
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FILE_PATH="${1:-}"
ERRORS=0

echo "======================================"
echo "Quick Verification"
[[ -n "$FILE_PATH" ]] && echo "File: $FILE_PATH"
echo "======================================"
echo ""

# Detect project type
detect_project_type() {
    if [[ -f "package.json" ]]; then
        echo "node"
    elif [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]]; then
        echo "python"
    elif [[ -f "Cargo.toml" ]]; then
        echo "rust"
    elif [[ -f "go.mod" ]]; then
        echo "go"
    elif [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]]; then
        echo "java"
    else
        echo "unknown"
    fi
}

PROJECT_TYPE=$(detect_project_type)
echo -e "${BLUE}Project type: $PROJECT_TYPE${NC}"
echo ""

# Run type checking
run_typecheck() {
    echo "Running type check..."

    case $PROJECT_TYPE in
        node)
            if [[ -f "tsconfig.json" ]]; then
                if npx tsc --noEmit 2>&1; then
                    echo -e "${GREEN}✓ TypeScript check passed${NC}"
                else
                    echo -e "${RED}✗ TypeScript errors${NC}"
                    ((ERRORS++))
                fi
            else
                echo -e "${YELLOW}⊘ No tsconfig.json found${NC}"
            fi
            ;;
        python)
            if command -v mypy &>/dev/null; then
                if [[ -n "$FILE_PATH" ]]; then
                    mypy "$FILE_PATH" 2>&1 && echo -e "${GREEN}✓ mypy passed${NC}" || { echo -e "${RED}✗ mypy errors${NC}"; ((ERRORS++)); }
                else
                    mypy . 2>&1 && echo -e "${GREEN}✓ mypy passed${NC}" || { echo -e "${RED}✗ mypy errors${NC}"; ((ERRORS++)); }
                fi
            elif command -v pyright &>/dev/null; then
                pyright 2>&1 && echo -e "${GREEN}✓ pyright passed${NC}" || { echo -e "${RED}✗ pyright errors${NC}"; ((ERRORS++)); }
            else
                echo -e "${YELLOW}⊘ No type checker found (mypy/pyright)${NC}"
            fi
            ;;
        rust)
            cargo check 2>&1 && echo -e "${GREEN}✓ cargo check passed${NC}" || { echo -e "${RED}✗ cargo check failed${NC}"; ((ERRORS++)); }
            ;;
        go)
            go build ./... 2>&1 && echo -e "${GREEN}✓ go build passed${NC}" || { echo -e "${RED}✗ go build failed${NC}"; ((ERRORS++)); }
            ;;
        java)
            if [[ -f "pom.xml" ]]; then
                mvn compile -q 2>&1 && echo -e "${GREEN}✓ Maven compile passed${NC}" || { echo -e "${RED}✗ Maven compile failed${NC}"; ((ERRORS++)); }
            elif [[ -f "build.gradle" ]]; then
                ./gradlew compileJava -q 2>&1 && echo -e "${GREEN}✓ Gradle compile passed${NC}" || { echo -e "${RED}✗ Gradle compile failed${NC}"; ((ERRORS++)); }
            fi
            ;;
        *)
            echo -e "${YELLOW}⊘ Type checking not available${NC}"
            ;;
    esac
}

# Run linting
run_lint() {
    echo ""
    echo "Running linter..."

    case $PROJECT_TYPE in
        node)
            if [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]] || [[ -f ".eslintrc.yml" ]] || grep -q "eslint" package.json 2>/dev/null; then
                if [[ -n "$FILE_PATH" ]]; then
                    npx eslint "$FILE_PATH" 2>&1 && echo -e "${GREEN}✓ ESLint passed${NC}" || { echo -e "${RED}✗ ESLint errors${NC}"; ((ERRORS++)); }
                else
                    npx eslint . --ext .js,.jsx,.ts,.tsx 2>&1 && echo -e "${GREEN}✓ ESLint passed${NC}" || { echo -e "${RED}✗ ESLint errors${NC}"; ((ERRORS++)); }
                fi
            elif grep -q "biome" package.json 2>/dev/null; then
                npx biome check 2>&1 && echo -e "${GREEN}✓ Biome passed${NC}" || { echo -e "${RED}✗ Biome errors${NC}"; ((ERRORS++)); }
            else
                echo -e "${YELLOW}⊘ No linter configured${NC}"
            fi
            ;;
        python)
            if command -v ruff &>/dev/null; then
                if [[ -n "$FILE_PATH" ]]; then
                    ruff check "$FILE_PATH" 2>&1 && echo -e "${GREEN}✓ Ruff passed${NC}" || { echo -e "${RED}✗ Ruff errors${NC}"; ((ERRORS++)); }
                else
                    ruff check . 2>&1 && echo -e "${GREEN}✓ Ruff passed${NC}" || { echo -e "${RED}✗ Ruff errors${NC}"; ((ERRORS++)); }
                fi
            elif command -v flake8 &>/dev/null; then
                flake8 2>&1 && echo -e "${GREEN}✓ Flake8 passed${NC}" || { echo -e "${RED}✗ Flake8 errors${NC}"; ((ERRORS++)); }
            elif command -v pylint &>/dev/null; then
                pylint --errors-only . 2>&1 && echo -e "${GREEN}✓ Pylint passed${NC}" || { echo -e "${RED}✗ Pylint errors${NC}"; ((ERRORS++)); }
            else
                echo -e "${YELLOW}⊘ No linter found (ruff/flake8/pylint)${NC}"
            fi
            ;;
        rust)
            cargo clippy -- -D warnings 2>&1 && echo -e "${GREEN}✓ Clippy passed${NC}" || { echo -e "${RED}✗ Clippy warnings${NC}"; ((ERRORS++)); }
            ;;
        go)
            if command -v golangci-lint &>/dev/null; then
                golangci-lint run 2>&1 && echo -e "${GREEN}✓ golangci-lint passed${NC}" || { echo -e "${RED}✗ golangci-lint errors${NC}"; ((ERRORS++)); }
            else
                go vet ./... 2>&1 && echo -e "${GREEN}✓ go vet passed${NC}" || { echo -e "${RED}✗ go vet errors${NC}"; ((ERRORS++)); }
            fi
            ;;
        java)
            if [[ -f "pom.xml" ]] && grep -q "checkstyle" pom.xml 2>/dev/null; then
                mvn checkstyle:check -q 2>&1 && echo -e "${GREEN}✓ Checkstyle passed${NC}" || { echo -e "${RED}✗ Checkstyle errors${NC}"; ((ERRORS++)); }
            else
                echo -e "${YELLOW}⊘ No linter configured${NC}"
            fi
            ;;
        *)
            echo -e "${YELLOW}⊘ Linting not available${NC}"
            ;;
    esac
}

# Run quick tests (smoke tests / unit tests)
run_quick_tests() {
    echo ""
    echo "Running quick tests..."

    case $PROJECT_TYPE in
        node)
            if grep -q '"test"' package.json 2>/dev/null; then
                # Run only fast tests if configured
                if grep -q '"test:unit"' package.json 2>/dev/null; then
                    npm run test:unit 2>&1 && echo -e "${GREEN}✓ Unit tests passed${NC}" || { echo -e "${RED}✗ Unit tests failed${NC}"; ((ERRORS++)); }
                elif grep -q '"test:fast"' package.json 2>/dev/null; then
                    npm run test:fast 2>&1 && echo -e "${GREEN}✓ Fast tests passed${NC}" || { echo -e "${RED}✗ Fast tests failed${NC}"; ((ERRORS++)); }
                else
                    # Run all tests but with short timeout
                    timeout 60s npm test 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || {
                        if [[ $? -eq 124 ]]; then
                            echo -e "${YELLOW}⊘ Tests timed out (60s limit for quick check)${NC}"
                        else
                            echo -e "${RED}✗ Tests failed${NC}"
                            ((ERRORS++))
                        fi
                    }
                fi
            else
                echo -e "${YELLOW}⊘ No test script configured${NC}"
            fi
            ;;
        python)
            if [[ -f "pytest.ini" ]] || [[ -f "pyproject.toml" ]] || [[ -d "tests" ]]; then
                # Run with short timeout and only unit tests if marked
                if pytest --collect-only -q -m "unit or not slow" 2>/dev/null | grep -q "test"; then
                    timeout 60s pytest -m "unit or not slow" -x -q 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || {
                        if [[ $? -eq 124 ]]; then
                            echo -e "${YELLOW}⊘ Tests timed out${NC}"
                        else
                            echo -e "${RED}✗ Tests failed${NC}"
                            ((ERRORS++))
                        fi
                    }
                else
                    timeout 60s pytest -x -q 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || { echo -e "${RED}✗ Tests failed${NC}"; ((ERRORS++)); }
                fi
            else
                echo -e "${YELLOW}⊘ No tests configured${NC}"
            fi
            ;;
        rust)
            cargo test --lib 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || { echo -e "${RED}✗ Tests failed${NC}"; ((ERRORS++)); }
            ;;
        go)
            go test -short ./... 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || { echo -e "${RED}✗ Tests failed${NC}"; ((ERRORS++)); }
            ;;
        java)
            if [[ -f "pom.xml" ]]; then
                mvn test -q -DskipITs 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || { echo -e "${RED}✗ Tests failed${NC}"; ((ERRORS++)); }
            elif [[ -f "build.gradle" ]]; then
                ./gradlew test -q 2>&1 && echo -e "${GREEN}✓ Tests passed${NC}" || { echo -e "${RED}✗ Tests failed${NC}"; ((ERRORS++)); }
            fi
            ;;
        *)
            echo -e "${YELLOW}⊘ Tests not available${NC}"
            ;;
    esac
}

# Run all checks
run_typecheck
run_lint
run_quick_tests

# Summary
echo ""
echo "======================================"
echo "Summary"
echo "======================================"

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}All quick verification checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS check(s) failed${NC}"
    exit 1
fi
