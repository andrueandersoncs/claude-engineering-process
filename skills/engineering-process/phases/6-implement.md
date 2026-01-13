# Phase 6: Implement

## Purpose
Write tests first, then code that makes them pass. Follow the task breakdown using strict TDD: Red → Green → Refactor.

**CRITICAL: E2E tests MUST be written and verified to FAIL before any implementation code is written.**

## Agent
**Delegate to: `implementer`**

The implementer agent has full write access and follows the design document with test-first discipline.

## The Test-First Mandate

```
┌─────────────────────────────────────────────────────────────────┐
│ IRON RULE: NO IMPLEMENTATION CODE WITHOUT A FAILING TEST FIRST │
└─────────────────────────────────────────────────────────────────┘
```

### Why Tests First?
1. **Tests define done** - You know exactly what to build
2. **Tests verify they work** - A test that passes immediately hasn't been verified
3. **Tests guide design** - Writing tests first leads to better interfaces
4. **Tests prevent gold-plating** - You only write what's needed to pass

## Activities

### 1. Setup
Before writing ANY code:
- Review the design document
- Review the task breakdown (which should start with "Write failing E2E test")
- Understand the acceptance criteria as test scenarios
- Check existing test patterns for reference

### 2. Write E2E Tests FIRST (CRITICAL)

**This is the FIRST implementation task, before any feature code.**

```typescript
// Example: tests/e2e/user-login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});

test('shows error for invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
});
```

### 3. Verify Tests FAIL

**CRITICAL: Run the tests and confirm they fail. This is not optional.**

```bash
npx playwright test user-login.spec.ts
# Expected output: FAILED (because feature doesn't exist yet)
```

If tests pass immediately, something is wrong:
- Test is not actually testing the new feature
- Test is too vague
- Feature already exists (verify scope)

### 4. Implement to Make Tests Pass

**Only now do you write implementation code.**

For each implementation task:
1. Read the failing test to understand what's needed
2. Write the **minimum code** to make the test pass
3. Run the test to verify it passes
4. Refactor if needed while keeping tests green
5. Commit with clear message
6. Mark task complete

### 5. The Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────┐
│  RED: Write failing test                        │
│       ↓                                         │
│  GREEN: Write minimum code to pass              │
│       ↓                                         │
│  REFACTOR: Clean up while staying green         │
│       ↓                                         │
│  REPEAT for next feature                        │
└─────────────────────────────────────────────────┘
```

### 6. Unit Tests During Implementation

Write unit tests for complex logic as you implement:
- Business logic functions
- Validation rules
- Data transformations
- Edge cases

```typescript
// Example: src/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import { validateCredentials } from '../auth';

describe('validateCredentials', () => {
  it('returns true for valid email and password', () => {
    expect(validateCredentials('user@example.com', 'password123')).toBe(true);
  });

  it('returns false for empty email', () => {
    expect(validateCredentials('', 'password123')).toBe(false);
  });

  it('returns false for invalid email format', () => {
    expect(validateCredentials('notanemail', 'password123')).toBe(false);
  });
});
```

### 7. Code Quality
Maintain quality throughout:
- Follow project conventions
- Handle errors appropriately
- Add logging where useful
- No hardcoded secrets or magic values

### 8. Progress Tracking
Keep the task breakdown updated:
- Mark tasks as complete
- Note any deviations from design
- Flag blockers immediately
- **Track which tests are now passing**

## Delegation to Implementer Agent

```
Delegate to implementer agent:

Context: Implementation phase for [feature description]

Design document: docs/design-[feature].md
Task breakdown: docs/tasks-[feature].md

CRITICAL TEST-FIRST INSTRUCTIONS:
1. If E2E tests don't exist yet, write them FIRST
2. Run tests to verify they FAIL
3. Only then proceed with implementation
4. Run tests after each change to verify progress

Current task: [Task X.Y - Title]

Instructions:
- Follow the design document
- Write failing tests first (if not already done)
- Implement task X.Y to make tests pass
- Update task breakdown when complete
- Commit with conventional commit message
```

## Implementation Order (Test-First)

Follow this strict order:

```
0. Write E2E tests (MUST BE FIRST)
   ↓ Verify tests FAIL
   ↓
1. Database/Schema changes (if any)
   ↓
2. Data layer / Models
   ↓
3. Business logic / Services + Unit tests
   ↓
4. API endpoints / Controllers
   ↓
5. UI components (if any)
   ↓
6. Integration / Wiring
   ↓
7. Verify all E2E tests PASS
```

## Commit Guidelines

### Message Format
```
type: short description

Longer explanation if needed.

- Bullet points for details
- Reference to task: Task X.Y
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding tests
- `refactor`: Code change that doesn't change behavior
- `docs`: Documentation changes
- `chore`: Maintenance tasks

### Frequency
- Commit after each logical unit of work
- Don't batch unrelated changes
- Each commit should build/test successfully

## Quality Checklist

For each task:
- [ ] **E2E test was written FIRST and verified to FAIL**
- [ ] **E2E test now PASSES after implementation**
- [ ] Implementation matches design
- [ ] Unit tests cover complex logic
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] No type errors
- [ ] Error handling is appropriate
- [ ] No hardcoded values
- [ ] Follows project conventions

## Handling Issues

### Design Doesn't Work
```
1. Stop implementation
2. Document the issue:
   - What was attempted
   - Why it doesn't work
   - Proposed alternatives
3. Return to design phase or escalate
```

### Unexpected Complexity
```
1. Assess if within scope
2. If minor: proceed and note it
3. If major: pause and discuss
4. Update task breakdown if needed
```

### Blocked by Dependencies
```
1. Document the blocker
2. Check if workaround exists
3. If not: flag and work on unblocked tasks
4. Escalate if blocking all progress
```

## Output

- **E2E tests that verify the feature works**
- Implemented code that makes tests pass
- Unit tests for complex logic
- Updated task breakdown (tasks marked complete)
- Commit history with clear messages
- Notes on any deviations or issues

## Completion Criteria

- [ ] **CRITICAL: All E2E tests pass**
- [ ] **CRITICAL: Tests were written BEFORE implementation**
- [ ] All tasks in breakdown are complete
- [ ] All unit tests pass
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] All commits have clear messages
- [ ] Task breakdown reflects completion
- [ ] Any deviations from design are documented

## Next Phase
Proceed to [Phase 7: Validate](7-validate.md) when criteria are met.
