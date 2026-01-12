# Design: [Feature Name]

> Replace bracketed placeholders with actual content. Delete sections that don't apply.

## Overview

[Brief description of what this design addresses and why it's needed. 2-3 sentences.]

## User Story

> As a [role], I want [capability] so that [benefit].

## Requirements

### Functional Requirements
- [ ] FR1: [Requirement description]
- [ ] FR2: [Requirement description]
- [ ] FR3: [Requirement description]

### Non-Functional Requirements
- **Performance**: [Requirements, e.g., "Response time < 200ms for 95th percentile"]
- **Security**: [Requirements, e.g., "All endpoints require authentication"]
- **Scalability**: [Requirements, e.g., "Support 1000 concurrent users"]
- **Availability**: [Requirements, e.g., "99.9% uptime"]

## Research Summary

[Link to research notes or brief summary of key findings]

- Relevant code: `path/to/file.ts`
- Existing patterns: [Pattern name and location]
- Constraints discovered: [Constraint]

## Architecture

### System Context

```
[ASCII diagram or description of how this fits in the larger system]

┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│   API   │────▶│   DB    │
└─────────┘     └─────────┘     └─────────┘
```

### Component Design

[Description of new/modified components]

| Component | Responsibility | Location |
|-----------|---------------|----------|
| [Name] | [What it does] | `path/to/file` |

## API Design

> Delete this section if no API changes

### Endpoints

#### `POST /api/resource`

Create a new resource.

**Request:**
```json
{
  "field1": "string",
  "field2": 123
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "field1": "string",
  "field2": 123,
  "createdAt": "ISO-8601"
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized

### Authentication
[How authentication works for these endpoints]

### Authorization
[What permissions are required]

## Data Model

> Delete this section if no data changes

### Schema Changes

```sql
-- New table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field1 VARCHAR(255) NOT NULL,
  field2 INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_resources_field1 ON resources(field1);
```

### Relationships

```
resources 1───* resource_items
    │
    └──1 users
```

### Migration Strategy

1. Add new table (backward compatible)
2. Deploy code that uses new table
3. [Any data migration steps]

## Key Decisions

### Decision 1: [Topic, e.g., "Database Choice"]

**Context:** [Why this decision was needed]

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A: [Name] | [Advantages] | [Disadvantages] |
| B: [Name] | [Advantages] | [Disadvantages] |
| C: [Name] | [Advantages] | [Disadvantages] |

**Selected:** Option [X]

**Rationale:** [Why this option was chosen. Reference specific requirements or constraints.]

### Decision 2: [Topic]

[Repeat format for each significant decision]

## Implementation Notes

### Approach

[High-level implementation approach]

1. First, [step]
2. Then, [step]
3. Finally, [step]

### Patterns to Follow

- Use [pattern] from `path/to/example.ts`
- Error handling: [approach]
- Testing: [approach]

### Gotchas

- [Thing to watch out for]
- [Potential pitfall]

## Security Considerations

- [ ] Input validation: [How inputs will be validated]
- [ ] Authentication: [How auth is handled]
- [ ] Authorization: [Permission model]
- [ ] Data protection: [How sensitive data is protected]
- [ ] Audit logging: [What will be logged]

## Performance Considerations

- [ ] Expected load: [Volume]
- [ ] Query optimization: [Approach]
- [ ] Caching strategy: [If applicable]
- [ ] Async processing: [If applicable]

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk description] | Low/Medium/High | Low/Medium/High | [How to address] |

## Testing Strategy

### Unit Tests
- [What will be unit tested]

### Integration Tests
- [What will be integration tested]

### Manual Testing
- [Key scenarios to test manually]

## Open Questions

- [ ] [Question that needs resolution]
- [ ] [Question that needs resolution]

## Appendix

### References
- [Link to relevant documentation]
- [Link to similar implementations]

### Glossary
- **Term**: Definition
