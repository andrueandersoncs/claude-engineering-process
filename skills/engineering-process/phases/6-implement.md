# Phase 6: Implement

## Purpose
Write code that realizes the design. Follow the task breakdown, write tests, and commit incrementally.

## Agent
**Delegate to: `implementer`**

The implementer agent has full write access and follows the design document.

## Activities

### 1. Setup
Before writing code:
- Review the design document
- Review the task breakdown
- Understand the acceptance criteria
- Check existing patterns for reference

### 2. Task Execution
For each task in the breakdown:
1. Read relevant existing code
2. Write the implementation
3. Write/update tests
4. Run tests locally
5. Commit with clear message
6. Mark task complete in breakdown

### 3. Test Writing
Tests should accompany code:
- Unit tests for business logic
- Integration tests for API endpoints
- Cover happy path and edge cases
- Follow existing test patterns

### 4. Code Quality
Maintain quality throughout:
- Follow project conventions
- Handle errors appropriately
- Add logging where useful
- No hardcoded secrets or magic values

### 5. Progress Tracking
Keep the task breakdown updated:
- Mark tasks as complete
- Note any deviations from design
- Flag blockers immediately

## Delegation to Implementer Agent

```
Delegate to implementer agent:

Context: Implementation phase for [feature description]

Design document: docs/design-[feature].md
Task breakdown: docs/tasks-[feature].md

Current task: [Task X.Y - Title]

Instructions:
- Follow the design document
- Implement task X.Y
- Write tests for the changes
- Update task breakdown when complete
- Commit with conventional commit message
```

## Implementation Order

Follow the task breakdown order, generally:

```
1. Database/Schema changes (if any)
   ↓
2. Data layer / Models
   ↓
3. Business logic / Services
   ↓
4. API endpoints / Controllers
   ↓
5. UI components (if any)
   ↓
6. Integration / Wiring
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
- [ ] Implementation matches design
- [ ] Tests cover the changes
- [ ] Tests pass locally
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

- Implemented code with tests
- Updated task breakdown (tasks marked complete)
- Commit history with clear messages
- Notes on any deviations or issues

## Completion Criteria

- [ ] All tasks in breakdown are complete
- [ ] All tests pass
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] All commits have clear messages
- [ ] Task breakdown reflects completion
- [ ] Any deviations from design are documented

## Next Phase
Proceed to [Phase 7: Validate](7-validate.md) when criteria are met.
