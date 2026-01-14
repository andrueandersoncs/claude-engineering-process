# Research Notes: Terminal UI Implementation

## Relevant Code Locations

### Plugin Structure
- `.claude-plugin/plugin.json` - Plugin manifest
- `skills/engineering-process/SKILL.md:1-498` - Main orchestrator with workflow phases
- **No package.json exists** - Plugin is pure Markdown/Bash/JSON (documentation-driven)

### Workflow State Management
- Schema defined at `SKILL.md:72-87`
- Story directory structure: `<project>/docs/stories/<story-slug>/`
- Contains: workflow-state.json, research-notes.md, design.md, tasks.md

### Key Automation Scripts
- `scripts/loop.sh:1-518` - **Critical reference** for spawning Claude subprocesses
  - Line 429: `$CLAUDE_BIN -p "$prompt"` - How to spawn Claude
  - Lines 62-83: Progress bar with Unicode characters
  - Lines 98-114: ETA calculation pattern
  - Lines 117-179: Beautiful status display with box-drawing characters
- `scripts/show-status.sh:1-327` - Status display patterns
  - Lines 165-185: JSON output mode for programmatic parsing
  - Lines 80-110: Task statistics calculation
- `scripts/next-task.sh:1-257` - Task parser (tasks.md → JSON)
- `scripts/run-validation.sh:1-205` - Validation runner (typecheck, lint, tests)

## Verified Assumptions

- [x] workflow-state.json format is stable - Confirmed at `SKILL.md:72-87`
- [x] Single story at a time - Confirmed (isolated directories)
- [x] loop.sh spawns Claude CLI successfully - Confirmed at `loop.sh:429`
- [x] Progress tracking via task status markers - Confirmed
- [x] Ink is suitable for this level of UI complexity - Confirmed (used by Gatsby, Yarn, Prisma)
- [ ] Existing Node.js infrastructure - **REFUTED**: No package.json exists
- [ ] TypeScript setup exists - **REFUTED**: No tsconfig.json
- [ ] Monorepo structure exists - **REFUTED**: Flat plugin structure

## Ontology Check (REQUIRED)

| Entity/Role | Expected | Actual in Codebase | Gap? |
|-------------|----------|-------------------|------|
| 8-phase workflow | Standard phases | Confirmed (SKILL.md:92-103) | OK |
| workflow-state.json | Standard format | Confirmed (SKILL.md:72-87) | OK |
| Task breakdown | tasks.md with status | Confirmed with `[ ]` markers | OK |
| Auto-advance logic | Between phases | Delegated to agents (SKILL.md:110-142) | Design needed |
| Pause/resume | At any point | **Not implemented** | New feature |
| Real-time streaming | Stream Claude output | **Not in loop.sh** | Implementation needed |

## Detected Contradictions (REQUIRED)

| Requirement A | Requirement B / Constraint | Tension | Status |
|---------------|---------------------------|---------|--------|
| "Node.js + Ink" TUI | No package.json exists | STRUCTURAL | Resolved: TUI is **new package** |
| "Monorepo structure" | Flat plugin structure | STRUCTURAL | Resolved: Create `packages/tui/` |
| "Real-time streaming" | loop.sh runs in foreground | IMPLEMENTATION | Resolved: Use `child_process.spawn()` |
| "Pause/resume" | loop.sh has no pause | FEATURE GAP | Resolved: TUI implements pause logic |
| "Auto-advance phases" | User approval required for Phase 1,8 | CLARIFICATION | Resolved: Only auto-advance delegated phases |

## Critical Finding: The "Ralph Wiggum" Pattern

From `loop.sh:6-27`: The script spawns **fresh Claude context per task** to avoid context pollution and ensure consistent quality. **TUI should follow this pattern** - spawn fresh processes, not long-running sessions.

## Patterns to Follow

### Error Handling Pattern (loop.sh)
```bash
if ! $CLAUDE_BIN -p "$prompt"; then
    log_error "Claude execution failed"
    exit 1
fi
```

### Status Display Pattern (show-status.sh)
```bash
# Unicode progress bar
local bar=$(printf '%*s' $completed '' | tr ' ' '█')
bar="${bar}$(printf '%*s' $((total-completed)) '' | tr ' ' '░')"
```

### Testing: **No test infrastructure exists** (plugin is documentation-driven)
- Will need to set up Vitest for TUI package
- Consider Ink test utilities for component testing

## Test Infrastructure (REQUIRED)

### Framework & Configuration
- E2E Framework: **None exists** (TUI is new)
- Unit Framework: **None exists**
- Will need: Vitest + @inkjs/testing-library

### Running Tests (Future)
```bash
# Unit tests (to be implemented)
cd packages/tui && npm test

# Coverage
npm run test:coverage
```

### Existing Test Patterns
- No existing patterns (documentation-driven plugin)
- Will establish patterns in TUI package

## Dependencies & Constraints

### Current Plugin Dependencies
- Bash, jq, Claude CLI, standard UNIX tools

### Required for TUI
- Node.js 20+ (LTS)
- ink@5+ (React 18 compatible)
- react@18+
- @inkjs/ui (pre-built components)
- TypeScript 5+
- execa (better subprocess handling)

### Constraints
- No modification of plugin structure (TUI wraps, doesn't replace)
- Must read from `<project>/docs/stories/` directory
- Must match workflow-state.json schema exactly
- Claude CLI must be in PATH

## External Research

### Ink (Terminal UI Framework)
- Ink v5 supports React 18 with concurrent features
- Uses Yoga for flexbox layout (same as React Native)
- `useInput()` hook for keyboard handling
- `<Box>` for layouts, `<Text>` for text
- Production-ready: used by Gatsby, Yarn, Prisma, Vercel

### Example Ink Patterns
```jsx
import {Box, Text, useInput} from 'ink';

// Layout with panels
<Box flexDirection="column">
  <Box borderStyle="round" paddingX={1}>
    <Text>Header</Text>
  </Box>
  <Box flexDirection="row" flexGrow={1}>
    <Box width="30%"><Text>Sidebar</Text></Box>
    <Box flexGrow={1}><Text>Main</Text></Box>
  </Box>
</Box>

// Keyboard handling
useInput((input, key) => {
  if (input === 'p') togglePause();
  if (key.upArrow) navigateUp();
});
```

### Node.js Subprocess (execa)
```javascript
import {execa} from 'execa';

const subprocess = execa('claude', ['-p', prompt]);

subprocess.stdout.on('data', (chunk) => {
  updateOutputBuffer(chunk.toString());
});

const {exitCode} = await subprocess;
```

## Open Questions Remaining

- [ ] TypeScript or JavaScript? → **Recommend TypeScript**
- [ ] Build tooling? → **Recommend tsup (fast, zero-config)**
- [ ] Polling interval for workflow-state.json? → Suggest 1 second
- [ ] Log scrollback limit? → Suggest 1000 lines
- [ ] Phase completion detection? → Parse workflow-state.json after subprocess exits

## Recommendations for Design

### Project Structure
```
claude-engineering-process/
├── packages/
│   └── tui/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.tsx
│       │   ├── components/
│       │   │   ├── App.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── PhaseProgress.tsx
│       │   │   ├── TaskList.tsx
│       │   │   ├── OutputPanel.tsx
│       │   │   └── StoryPicker.tsx
│       │   ├── hooks/
│       │   │   ├── useWorkflowState.ts
│       │   │   ├── useClaudeProcess.ts
│       │   │   └── useTaskParser.ts
│       │   └── utils/
│       │       ├── state.ts
│       │       └── subprocess.ts
│       └── bin/
│           └── ep-tui.js
└── ... (existing plugin structure unchanged)
```

### TypeScript Interfaces
```typescript
interface WorkflowState {
  story: string;
  slug: string;
  source: string;
  jtbd?: { context: string; job: string; outcome: string };
  currentPhase: Phase;
  completedPhases: Phase[];
  startedAt: string;
  pausedAt?: string;  // TUI extension
}

type Phase = 'understand' | 'research' | 'scope' | 'design' |
             'decompose' | 'implement' | 'validate' | 'deploy';

interface Task {
  id: string;
  title: string;
  status: 'incomplete' | 'in_progress' | 'complete' | 'blocked';
  description?: string;
}
```

### UI Layout Sketch
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Story: terminal-ui-implementation    Phase: 6/8 (implement)     ┃
┃  Progress: ✓1 ✓2 ✓3 ✓4 ✓5 [6] 7 8                               ┃
┃  Tasks:    ███████████░░░ 75% (12/16 complete)                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  TASK LIST             ┃  CLAUDE OUTPUT                          ┃
┃  ─────────────────────  ┃  ─────────────────────────────────────  ┃
┃  ✓ 1.1 Setup project   ┃  > Implementing Task 1.4...             ┃
┃  ✓ 1.2 Dashboard       ┃  Reading patterns from design.md...     ┃
┃  ✓ 1.3 Phase progress  ┃  Creating Dashboard.tsx component...    ┃
┃  ⟳ 1.4 Task list       ┃                                         ┃
┃    1.5 Output panel    ┃  [streaming output continues...]        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  [p]ause [r]esume [s]tory [q]uit [?]help    Task: 00:02:34      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Key Implementation Recommendations
1. Follow the "fresh context per task" pattern from loop.sh
2. Use existing scripts via subprocess calls (show-status.sh, run-validation.sh)
3. Parse workflow-state.json for phase progress
4. Parse tasks.md for task list (use next-task.sh patterns)
5. Use Unicode progress bars like show-status.sh
6. Support JSON output from show-status.sh --json for data
