# Phase 4: Design

## Purpose
Plan the solution before implementing. Make architectural decisions and document them with rationale.

## Agent
**Delegate to: `architect`**

The architect agent specializes in design decisions and documentation.

## Activities

### 1. System Architecture
Determine how the feature fits into the system:
- Does this require new services/modules?
- What's the data flow?
- Are there new integration points?

### 2. API Design
If exposing interfaces:
- Define endpoints (REST, GraphQL, etc.)
- Specify request/response shapes
- Document authentication/authorization
- Plan error responses

### 3. Data Modeling
If data changes are needed:
- Define new schemas/tables
- Plan migrations
- Consider indexes for performance
- Document relationships

### 4. UI/UX Design
If there's a frontend component:
- Reference mockups/wireframes
- Define component structure
- Plan state management
- Consider accessibility

### 5. Decision Documentation
For each significant choice:
- Document alternatives considered
- Explain why the chosen option is best
- Note trade-offs accepted

### 6. Risk Assessment
Review technical risks:
- Security implications
- Performance concerns
- Scalability considerations
- Maintenance burden

## Delegation to Architect Agent

```
Delegate to architect agent:

Context: Design phase for [feature description]

Research findings: [Link to research notes or summary]

Scope:
- In scope: [Items]
- Out of scope: [Items]

Constraints:
- [Constraint 1]
- [Constraint 2]

Expected output: Design document using template
```

## Output

Create `design.md` in the story directory (`<project>/docs/stories/<story-slug>/design.md`) using [design template](../templates/design-doc.md):

```markdown
# Design: [Feature Name]

## Overview
[What this design addresses and why]

## Requirements
### Functional
- Requirement 1
- Requirement 2

### Non-Functional
- Performance: [constraints]
- Security: [requirements]

## Architecture
[System changes, diagrams]

## API Design
[Endpoints, contracts]

## Data Model
[Schema changes]

## Key Decisions

### Decision 1: [Topic]
**Context**: [Why needed]
**Options**:
1. [Option A] - [pros/cons]
2. [Option B] - [pros/cons]
**Selected**: [Option X]
**Rationale**: [Why]

## Implementation Notes
[Guidance for implementers]

## Risks & Mitigations
[Table of risks]
```

## Completion Criteria

- [ ] Architecture is defined
- [ ] API contracts are specified (if applicable)
- [ ] Data model changes are documented (if applicable)
- [ ] Key decisions are documented with rationale
- [ ] Risks are identified with mitigations
- [ ] Design document is saved as artifact
- [ ] Design is reviewable by others

## Design Review Checklist

Before finalizing:
- [ ] Solves the stated requirements
- [ ] Follows existing patterns where appropriate
- [ ] Doesn't over-engineer for hypothetical futures
- [ ] Security implications considered
- [ ] Performance implications considered
- [ ] Migration path is clear (if changing existing systems)
- [ ] Testable implementation approach

## Common Pitfalls

1. **Over-Engineering** - Building for requirements that don't exist
2. **Under-Specification** - Leaving critical details undefined
3. **Pattern Mismatch** - Using patterns that don't fit the codebase
4. **Missing Rationale** - Documenting "what" but not "why"

## Next Phase
Proceed to [Phase 5: Decompose](5-decompose.md) when criteria are met.
