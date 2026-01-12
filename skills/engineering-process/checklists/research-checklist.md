# Research Phase Checklist

Use this checklist to ensure thorough research before design.

## Codebase Exploration

### Relevant Areas Identified
- [ ] Entry points (routes, handlers, components) located
- [ ] Data layer (models, schemas, repositories) examined
- [ ] Business logic (services, utilities) understood
- [ ] Related existing features found and studied

### File Inventory
- [ ] All files that will need modification listed
- [ ] File purposes and responsibilities understood
- [ ] File ownership/maintainers identified (if relevant)

## Assumption Verification

### Requirements Assumptions
- [ ] Data exists in expected format
- [ ] APIs have required capabilities
- [ ] User permissions support the feature
- [ ] External dependencies are available

### Technical Assumptions
- [ ] Performance will meet requirements
- [ ] Security model supports the feature
- [ ] Infrastructure can handle the change
- [ ] No conflicting features or code

### Each Assumption
- [ ] Explicitly documented
- [ ] Evidence found (file:line reference)
- [ ] Marked as verified OR refuted

## Pattern Recognition

### Coding Patterns
- [ ] Code style/formatting conventions noted
- [ ] Naming conventions documented
- [ ] File organization patterns understood
- [ ] Module/component structure clear

### Architecture Patterns
- [ ] Error handling approach identified
- [ ] Logging patterns documented
- [ ] API response format understood
- [ ] Authentication/authorization pattern clear

### Testing Patterns
- [ ] Test file naming/location understood
- [ ] Test structure/framework identified
- [ ] Fixture/mock patterns documented
- [ ] Coverage expectations known

## Dependencies

### Internal Dependencies
- [ ] Shared utilities that should be reused
- [ ] Common components/modules
- [ ] Internal APIs or services

### External Dependencies
- [ ] Third-party libraries needed
- [ ] External APIs to integrate
- [ ] Infrastructure services required

### Dependency Status
- [ ] All dependencies available
- [ ] Version compatibility verified
- [ ] No conflicting dependencies

## Documentation

### Research Notes Complete
- [ ] All findings documented with references
- [ ] Code locations include file:line
- [ ] Patterns documented with examples
- [ ] Questions and uncertainties listed

### Ready for Design
- [ ] No blocking questions remain
- [ ] Sufficient understanding to design
- [ ] Constraints and limitations clear
- [ ] Recommendations for design documented

## Sign-off

- [ ] Research notes saved to `docs/research-notes.md`
- [ ] Workflow state updated with artifact path
- [ ] Ready to proceed to Scope phase
