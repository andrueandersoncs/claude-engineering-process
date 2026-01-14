// @engineering-process/tui - Terminal UI for engineering-process plugin

// src/index.tsx
import { existsSync as existsSync2 } from "fs";
import { join as join7 } from "path";
import { render } from "ink";

// src/components/App.tsx
import { useEffect as useEffect4, useState as useState4, useCallback as useCallback3, useRef as useRef3 } from "react";
import { Box as Box12, Text as Text11 } from "ink";

// src/components/StoryPicker.tsx
import { Box as Box2, Text as Text2 } from "ink";

// src/utils/formatting.ts
function formatTimerDisplay(seconds) {
  if (seconds < 0) {
    return "00:00:00";
  }
  const wholeSecs = Math.floor(seconds);
  const hours = Math.floor(wholeSecs / 3600);
  const mins = Math.floor(wholeSecs % 3600 / 60);
  const secs = wholeSecs % 60;
  return [hours, mins, secs].map((n) => n.toString().padStart(2, "0")).join(":");
}
function drawProgressBar(current, total, width = 20) {
  if (total <= 0) {
    return "\u2591".repeat(width);
  }
  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}
function calculatePercentage(current, total) {
  if (total <= 0) {
    return 0;
  }
  return Math.round(Math.min(Math.max(current / total * 100, 0), 100));
}
function truncate(str, maxLength) {
  if (maxLength < 4) {
    return str.slice(0, maxLength);
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
}

// src/utils/constants.ts
var PHASES = [
  "understand",
  "research",
  "scope",
  "design",
  "decompose",
  "implement",
  "validate",
  "deploy"
];

// src/components/StoryCreator.tsx
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function StoryCreator({
  onSubmit,
  onCancel,
  error
}) {
  const [inputValue, setInputValue] = useState("");
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSubmit(inputValue);
      return;
    }
    if (key.backspace || key.delete) {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }
    if (key.ctrl || key.meta || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      return;
    }
    if (input) {
      setInputValue((prev) => prev + input);
    }
  });
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", padding: 1, children: [
    /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: "Story title: " }),
      /* @__PURE__ */ jsx(Text, { children: inputValue }),
      /* @__PURE__ */ jsx(Text, { color: "gray", children: "\u2588" })
    ] }),
    error && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { color: "red", children: error }) }),
    /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Enter to submit, Esc to cancel" }) })
  ] });
}

// src/components/StoryPicker.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function getPhaseNumber(phase) {
  const index = PHASES.indexOf(phase);
  return index >= 0 ? index + 1 : 0;
}
function StoryItem({
  story,
  isSelected
}) {
  const phaseNum = getPhaseNumber(story.phase);
  const progress = calculatePercentage(story.tasksComplete, story.tasksTotal);
  const progressBar = drawProgressBar(story.tasksComplete, story.tasksTotal, 10);
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", paddingLeft: isSelected ? 0 : 2, children: [
    /* @__PURE__ */ jsxs2(Box2, { children: [
      /* @__PURE__ */ jsx2(Text2, { color: isSelected ? "cyan" : void 0, children: isSelected ? "> " : "  " }),
      /* @__PURE__ */ jsx2(Text2, { bold: isSelected, color: isSelected ? "cyan" : void 0, children: truncate(story.slug, 30) })
    ] }),
    /* @__PURE__ */ jsxs2(Box2, { paddingLeft: 4, children: [
      /* @__PURE__ */ jsxs2(Text2, { dimColor: !isSelected, children: [
        "Phase: ",
        phaseNum,
        "/8 (",
        story.phase,
        ")"
      ] }),
      /* @__PURE__ */ jsx2(Text2, { children: " | " }),
      /* @__PURE__ */ jsxs2(Text2, { dimColor: !isSelected, children: [
        "Tasks: ",
        progressBar,
        " ",
        progress,
        "% (",
        story.tasksComplete,
        "/",
        story.tasksTotal,
        ")"
      ] })
    ] })
  ] });
}
function StoryPicker({
  stories,
  selectedIndex,
  onSelect: _onSelect,
  onCancel: _onCancel,
  maxHeight,
  isCreating = false,
  onSubmitCreate,
  onCancelCreate,
  createError
}) {
  void _onSelect;
  void _onCancel;
  if (isCreating && onSubmitCreate && onCancelCreate) {
    return /* @__PURE__ */ jsx2(
      StoryCreator,
      {
        onSubmit: onSubmitCreate,
        onCancel: onCancelCreate,
        error: createError
      }
    );
  }
  if (stories.length === 0) {
    return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", padding: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "yellow", children: "Select a Story" }),
      /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "No stories found in docs/stories/" }) }),
      /* @__PURE__ */ jsx2(Box2, { marginTop: 1, children: /* @__PURE__ */ jsx2(Text2, { color: "green", children: "+ Create New Story [n]" }) })
    ] });
  }
  const clampedIndex = Math.max(0, Math.min(selectedIndex, stories.length - 1));
  let visibleStories = stories;
  let startIndex = 0;
  const effectiveMaxItems = maxHeight ? Math.floor(maxHeight / 2) : void 0;
  if (effectiveMaxItems && effectiveMaxItems > 0 && stories.length > effectiveMaxItems) {
    const halfWindow = Math.floor(effectiveMaxItems / 2);
    startIndex = Math.max(0, clampedIndex - halfWindow);
    if (startIndex + effectiveMaxItems > stories.length) {
      startIndex = Math.max(0, stories.length - effectiveMaxItems);
    }
    visibleStories = stories.slice(startIndex, startIndex + effectiveMaxItems);
  }
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", padding: 1, children: [
    /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Select a Story" }),
    /* @__PURE__ */ jsx2(Box2, { marginTop: 1, marginBottom: 1, children: /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "Use \u2191/\u2193 to navigate, Enter to select, n for new, Esc to cancel" }) }),
    /* @__PURE__ */ jsx2(Box2, { marginBottom: 1, children: /* @__PURE__ */ jsx2(Text2, { color: "green", children: "+ Create New Story [n]" }) }),
    startIndex > 0 && /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
      "  \u25B2 (",
      startIndex,
      " more above)"
    ] }),
    visibleStories.map((story, index) => {
      const actualIndex = startIndex + index;
      const isSelected = actualIndex === clampedIndex;
      return /* @__PURE__ */ jsx2(Box2, { marginY: 0, children: /* @__PURE__ */ jsx2(StoryItem, { story, isSelected }) }, story.slug);
    }),
    effectiveMaxItems && effectiveMaxItems > 0 && startIndex + effectiveMaxItems < stories.length && /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
      "  ",
      "\u25BC (",
      stories.length - startIndex - effectiveMaxItems,
      " more below)"
    ] })
  ] });
}

// src/components/Dashboard.tsx
import { Box as Box10, useStdout } from "ink";

// src/components/Header.tsx
import { Box as Box4, Text as Text4 } from "ink";

// src/components/PhaseProgress.tsx
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function PhaseProgress({ currentPhase, completedPhases }) {
  return /* @__PURE__ */ jsx3(Box3, { children: PHASES.map((phase, index) => {
    const phaseNumber = index + 1;
    const isCompleted = completedPhases.includes(phase);
    const isCurrent = phase === currentPhase;
    if (isCurrent) {
      return /* @__PURE__ */ jsxs3(Text3, { color: "cyan", bold: true, children: [
        "[",
        phaseNumber,
        "]",
        index < PHASES.length - 1 ? " " : ""
      ] }, phase);
    } else if (isCompleted) {
      return /* @__PURE__ */ jsxs3(Text3, { color: "green", children: [
        phaseNumber,
        index < PHASES.length - 1 ? " " : ""
      ] }, phase);
    } else {
      return /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
        phaseNumber,
        index < PHASES.length - 1 ? " " : ""
      ] }, phase);
    }
  }) });
}

// src/components/Header.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function Header({
  storySlug,
  storyTitle,
  currentPhase,
  completedPhases,
  tasksComplete,
  tasksTotal
}) {
  const phaseIndex = PHASES.indexOf(currentPhase);
  const phaseNumber = phaseIndex === -1 ? 0 : phaseIndex + 1;
  const totalPhases = PHASES.length;
  const percentage = calculatePercentage(tasksComplete, tasksTotal);
  const progressBar = drawProgressBar(tasksComplete, tasksTotal, 16);
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsxs4(Box4, { children: [
      /* @__PURE__ */ jsxs4(Text4, { children: [
        /* @__PURE__ */ jsx4(Text4, { bold: true, children: "Story:" }),
        " ",
        storySlug,
        storyTitle && storyTitle !== storySlug ? ` (${storyTitle})` : ""
      ] }),
      /* @__PURE__ */ jsx4(Text4, { children: "    " }),
      /* @__PURE__ */ jsxs4(Text4, { children: [
        /* @__PURE__ */ jsx4(Text4, { bold: true, children: "Phase:" }),
        " ",
        phaseNumber,
        "/",
        totalPhases,
        " (",
        currentPhase,
        ")"
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(Box4, { children: [
      /* @__PURE__ */ jsx4(Text4, { bold: true, children: "Progress:" }),
      /* @__PURE__ */ jsx4(Text4, { children: " " }),
      /* @__PURE__ */ jsx4(PhaseProgress, { currentPhase, completedPhases })
    ] }),
    /* @__PURE__ */ jsxs4(Box4, { children: [
      /* @__PURE__ */ jsx4(Text4, { bold: true, children: "Tasks:" }),
      /* @__PURE__ */ jsx4(Text4, { children: "    " }),
      /* @__PURE__ */ jsx4(Text4, { color: "green", children: progressBar }),
      /* @__PURE__ */ jsxs4(Text4, { children: [
        " ",
        percentage,
        "% (",
        tasksComplete,
        "/",
        tasksTotal,
        ")"
      ] })
    ] })
  ] });
}

// src/components/TaskListPanel.tsx
import { Box as Box6, Text as Text6 } from "ink";

// src/components/TaskItem.tsx
import { Box as Box5, Text as Text5 } from "ink";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function getStatusDisplay(status) {
  switch (status) {
    case "complete":
      return { symbol: "[x]", color: "green" };
    case "in_progress":
      return { symbol: "[~]", color: "yellow" };
    case "blocked":
      return { symbol: "[!]", color: "red" };
    case "incomplete":
    default:
      return { symbol: "[ ]", color: "gray" };
  }
}
function truncateWithEllipsis(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}
function TaskItem({
  task,
  isActive,
  isSelected,
  maxTitleWidth = 50
}) {
  const { symbol, color } = getStatusDisplay(task.status);
  const displayTitle = truncateWithEllipsis(task.title, maxTitleWidth);
  const textColor = isActive ? "cyan" : isSelected ? "white" : void 0;
  const isBold = isActive || isSelected;
  const isDimmed = !isActive && !isSelected && task.status === "incomplete";
  return /* @__PURE__ */ jsxs5(Box5, { children: [
    /* @__PURE__ */ jsx5(Text5, { color: isSelected ? "cyan" : void 0, children: isSelected ? "> " : "  " }),
    /* @__PURE__ */ jsx5(Text5, { color, children: symbol }),
    /* @__PURE__ */ jsxs5(Text5, { color: textColor, bold: isBold, dimColor: isDimmed, children: [
      " ",
      task.id
    ] }),
    /* @__PURE__ */ jsxs5(Text5, { color: textColor, bold: isBold, dimColor: isDimmed, children: [
      " ",
      displayTitle
    ] }),
    isActive && /* @__PURE__ */ jsx5(Text5, { color: "cyan", bold: true, children: " <" })
  ] });
}

// src/components/TaskListPanel.tsx
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function TaskListPanel({
  tasks,
  activeTaskId,
  selectedIndex,
  maxHeight
}) {
  if (tasks.length === 0) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "No tasks" }) });
  }
  const clampedSelectedIndex = Math.max(
    0,
    Math.min(selectedIndex, tasks.length - 1)
  );
  let visibleTasks = tasks;
  let startIndex = 0;
  if (maxHeight && maxHeight > 0 && tasks.length > maxHeight) {
    const halfWindow = Math.floor(maxHeight / 2);
    startIndex = Math.max(0, clampedSelectedIndex - halfWindow);
    if (startIndex + maxHeight > tasks.length) {
      startIndex = Math.max(0, tasks.length - maxHeight);
    }
    visibleTasks = tasks.slice(startIndex, startIndex + maxHeight);
  }
  return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", children: [
    startIndex > 0 && /* @__PURE__ */ jsxs6(Text6, { dimColor: true, children: [
      "  \u25B2 (",
      startIndex,
      " more above)"
    ] }),
    visibleTasks.map((task, index) => {
      const actualIndex = startIndex + index;
      const isActive = task.id === activeTaskId;
      const isSelected = actualIndex === clampedSelectedIndex;
      return /* @__PURE__ */ jsx6(
        TaskItem,
        {
          task,
          isActive,
          isSelected
        },
        task.id
      );
    }),
    maxHeight && maxHeight > 0 && startIndex + maxHeight < tasks.length && /* @__PURE__ */ jsxs6(Text6, { dimColor: true, children: [
      "  ",
      "\u25BC (",
      tasks.length - startIndex - maxHeight,
      " more below)"
    ] })
  ] });
}

// src/components/OutputPanel.tsx
import { useState as useState2, useEffect, useRef } from "react";
import { Box as Box7, Text as Text7, useInput as useInput2 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var DEFAULT_MAX_VISIBLE_LINES = 20;
function OutputPanel({
  lines,
  maxVisibleLines = DEFAULT_MAX_VISIBLE_LINES,
  autoScroll = true,
  isFocused = false
}) {
  const [scrollOffset, setScrollOffset] = useState2(0);
  const prevLineCountRef = useRef(lines.length);
  useEffect(() => {
    if (autoScroll && lines.length > prevLineCountRef.current) {
      setScrollOffset(0);
    }
    prevLineCountRef.current = lines.length;
  }, [lines.length, autoScroll]);
  useInput2(
    (input, key) => {
      if (!isFocused) return;
      const pageSize = Math.max(1, maxVisibleLines - 2);
      if (key.pageUp) {
        setScrollOffset(
          (prev) => Math.min(prev + pageSize, Math.max(0, lines.length - maxVisibleLines))
        );
      } else if (key.pageDown) {
        setScrollOffset((prev) => Math.max(0, prev - pageSize));
      } else if (input === "g" && key.shift) {
        setScrollOffset(0);
      } else if (input === "g") {
        setScrollOffset(Math.max(0, lines.length - maxVisibleLines));
      }
    },
    { isActive: isFocused }
  );
  if (lines.length === 0) {
    return /* @__PURE__ */ jsx7(Box7, { flexDirection: "column", flexGrow: 1, children: /* @__PURE__ */ jsx7(Text7, { dimColor: true, children: "No output yet. Press Enter to start the workflow." }) });
  }
  const totalLines = lines.length;
  const effectiveMaxVisible = Math.min(maxVisibleLines, totalLines);
  const endIndex = totalLines - scrollOffset;
  const startIndex = Math.max(0, endIndex - effectiveMaxVisible);
  const visibleLines = lines.slice(startIndex, endIndex);
  const isAtBottom = scrollOffset === 0;
  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = endIndex < totalLines;
  return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", flexGrow: 1, children: [
    hasMoreAbove && /* @__PURE__ */ jsxs7(Text7, { dimColor: true, children: [
      "  ",
      "--- ",
      startIndex,
      " lines above (PgUp to scroll) ---"
    ] }),
    visibleLines.map((line, index) => /* @__PURE__ */ jsx7(Text7, { children: line }, `${startIndex + index}-${line.slice(0, 20)}`)),
    hasMoreBelow && /* @__PURE__ */ jsxs7(Text7, { dimColor: true, children: [
      "  ",
      "--- ",
      totalLines - endIndex,
      " lines below (PgDn to scroll) ---"
    ] }),
    !isAtBottom && /* @__PURE__ */ jsxs7(Text7, { dimColor: true, italic: true, children: [
      "  ",
      "[Auto-scroll paused - press G to go to bottom]"
    ] })
  ] });
}

// src/components/StatusBar.tsx
import { Box as Box8, Text as Text8 } from "ink";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function buildKeyHints(isRunning, isPaused) {
  return [
    {
      key: "p",
      label: "pause",
      // Pause is enabled when running and not already paused
      enabled: isRunning && !isPaused
    },
    {
      key: "r",
      label: "resume",
      // Resume is enabled when paused OR when not running (to start)
      enabled: isPaused || !isRunning
    },
    {
      key: "s",
      label: "story",
      // Story picker is always available
      enabled: true
    },
    {
      key: "q",
      label: "quit",
      // Quit is always available
      enabled: true
    },
    {
      key: "?",
      label: "help",
      // Help is always available
      enabled: true
    }
  ];
}
function KeyHintDisplay({ hint }) {
  return /* @__PURE__ */ jsxs8(Text8, { dimColor: !hint.enabled, children: [
    "[",
    /* @__PURE__ */ jsx8(Text8, { color: hint.enabled ? "cyan" : void 0, children: hint.key }),
    "]",
    hint.label
  ] });
}
function StatusBar({
  isRunning,
  isPaused,
  currentTaskId,
  elapsedSeconds
}) {
  const keyHints = buildKeyHints(isRunning, isPaused);
  const timerDisplay = formatTimerDisplay(elapsedSeconds);
  return /* @__PURE__ */ jsxs8(Box8, { paddingX: 1, justifyContent: "space-between", children: [
    /* @__PURE__ */ jsxs8(Box8, { children: [
      keyHints.map((hint) => /* @__PURE__ */ jsx8(Box8, { marginRight: 1, children: /* @__PURE__ */ jsx8(KeyHintDisplay, { hint }) }, hint.key)),
      isPaused && /* @__PURE__ */ jsxs8(Text8, { color: "yellow", bold: true, children: [
        " ",
        "PAUSED"
      ] })
    ] }),
    /* @__PURE__ */ jsx8(Box8, { children: currentTaskId && isRunning && /* @__PURE__ */ jsxs8(Text8, { children: [
      /* @__PURE__ */ jsxs8(Text8, { bold: true, children: [
        "Task ",
        currentTaskId,
        ":"
      ] }),
      " ",
      timerDisplay
    ] }) })
  ] });
}

// src/components/SetupView.tsx
import { Box as Box9, Text as Text9 } from "ink";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var PHASE_DESCRIPTIONS = {
  understand: "Comprehend requirements, identify gaps",
  research: "Explore codebase, verify assumptions",
  scope: "Define boundaries, minimal implementation",
  design: "Architecture decisions, document approach",
  decompose: "Break into implementable tasks",
  implement: "Write code and tests",
  validate: "Review, test, verify criteria",
  deploy: "Release and monitor"
};
function SetupView({
  story,
  isStarting = false,
  isRunning = false,
  output = []
}) {
  const currentPhaseDesc = PHASE_DESCRIPTIONS[story.currentPhase] ?? "Unknown phase";
  const isActive = isStarting || isRunning;
  if (isActive) {
    return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", paddingX: 2, paddingY: 1, children: [
      /* @__PURE__ */ jsxs9(Box9, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx9(Text9, { bold: true, color: "cyan", children: "Engineering Workflow" }),
        /* @__PURE__ */ jsx9(Text9, { children: " - " }),
        /* @__PURE__ */ jsx9(Text9, { color: "yellow", children: story.story })
      ] }),
      /* @__PURE__ */ jsxs9(Box9, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx9(Text9, { color: "green", children: "\u25CF Running" }),
        /* @__PURE__ */ jsxs9(Text9, { dimColor: true, children: [
          " - Phase: ",
          story.currentPhase
        ] })
      ] }),
      /* @__PURE__ */ jsx9(
        Box9,
        {
          flexDirection: "column",
          borderStyle: "single",
          borderColor: "gray",
          paddingX: 1,
          flexGrow: 1,
          minHeight: 10,
          children: output.length === 0 ? /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Waiting for output..." }) : output.slice(-20).map((line, index) => /* @__PURE__ */ jsx9(Text9, { children: line }, index))
        }
      ),
      /* @__PURE__ */ jsx9(Box9, { marginTop: 1, children: /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "[q] Quit  [?] Help" }) })
    ] });
  }
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", paddingX: 2, paddingY: 1, children: [
    /* @__PURE__ */ jsx9(Box9, { marginBottom: 1, children: /* @__PURE__ */ jsx9(Text9, { bold: true, color: "cyan", children: "Story Setup" }) }),
    /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsxs9(Text9, { children: [
        /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Story: " }),
        /* @__PURE__ */ jsx9(Text9, { bold: true, children: story.story })
      ] }),
      /* @__PURE__ */ jsxs9(Text9, { children: [
        /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Slug: " }),
        /* @__PURE__ */ jsx9(Text9, { children: story.slug })
      ] }),
      /* @__PURE__ */ jsxs9(Text9, { children: [
        /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Phase: " }),
        /* @__PURE__ */ jsx9(Text9, { color: "yellow", children: story.currentPhase }),
        /* @__PURE__ */ jsxs9(Text9, { dimColor: true, children: [
          " - ",
          currentPhaseDesc
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs9(
      Box9,
      {
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "gray",
        paddingX: 2,
        paddingY: 1,
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsx9(Text9, { children: "This story needs to go through the engineering workflow to generate implementation tasks." }),
          /* @__PURE__ */ jsx9(Text9, { children: " " }),
          /* @__PURE__ */ jsx9(Text9, { children: "The workflow will:" }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "  1. Analyze and understand the requirements" }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "  2. Research the codebase for context" }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "  3. Define the scope of work" }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "  4. Design the solution" }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "  5. Decompose into individual tasks" }),
          /* @__PURE__ */ jsx9(Text9, { children: " " }),
          /* @__PURE__ */ jsx9(Text9, { children: "Once tasks are generated, you can track progress and execute them from this dashboard." })
        ]
      }
    ),
    /* @__PURE__ */ jsx9(Box9, { children: /* @__PURE__ */ jsxs9(Text9, { children: [
      /* @__PURE__ */ jsx9(Text9, { color: "green", bold: true, children: "Press Enter" }),
      /* @__PURE__ */ jsx9(Text9, { children: " to start the engineering workflow" })
    ] }) }),
    /* @__PURE__ */ jsx9(Box9, { marginTop: 1, children: /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "[s] Switch story  [q] Quit  [?] Help" }) })
  ] });
}

// src/components/Dashboard.tsx
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var MIN_WIDTH = 80;
var MIN_HEIGHT = 24;
var TASK_PANEL_WIDTH_PERCENT = 30;
var HEADER_ROWS = 3;
var STATUS_BAR_ROWS = 1;
function Dashboard({
  story,
  tasks,
  output,
  isRunning,
  isPaused,
  activeTaskId,
  selectedTaskIndex,
  onSelectTask,
  elapsedSeconds,
  isStartingWorkflow = false
}) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? MIN_WIDTH;
  const terminalHeight = stdout?.rows ?? MIN_HEIGHT;
  const width = Math.max(terminalWidth, MIN_WIDTH);
  const height = Math.max(terminalHeight, MIN_HEIGHT);
  const mainAreaHeight = Math.max(1, height - HEADER_ROWS - STATUS_BAR_ROWS);
  const taskListMaxHeight = Math.max(1, mainAreaHeight - 2);
  const outputMaxLines = Math.max(1, mainAreaHeight - 2);
  const tasksComplete = tasks.filter((t) => t.status === "complete").length;
  const tasksTotal = tasks.length;
  const showSetupView = tasksTotal === 0;
  if (showSetupView) {
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", height, width, children: [
      /* @__PURE__ */ jsx10(Box10, { flexShrink: 0, children: /* @__PURE__ */ jsx10(
        Header,
        {
          storySlug: story.slug,
          storyTitle: story.story,
          currentPhase: story.currentPhase,
          completedPhases: story.completedPhases,
          tasksComplete: 0,
          tasksTotal: 0
        }
      ) }),
      /* @__PURE__ */ jsx10(Box10, { flexGrow: 1, borderStyle: "single", borderColor: "gray", children: /* @__PURE__ */ jsx10(
        SetupView,
        {
          story,
          isStarting: isStartingWorkflow,
          isRunning,
          output
        }
      ) }),
      /* @__PURE__ */ jsx10(Box10, { flexShrink: 0, children: /* @__PURE__ */ jsx10(
        StatusBar,
        {
          isRunning,
          isPaused,
          currentTaskId: null,
          elapsedSeconds
        }
      ) })
    ] });
  }
  return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", height, width, children: [
    /* @__PURE__ */ jsx10(Box10, { flexShrink: 0, children: /* @__PURE__ */ jsx10(
      Header,
      {
        storySlug: story.slug,
        storyTitle: story.story,
        currentPhase: story.currentPhase,
        completedPhases: story.completedPhases,
        tasksComplete,
        tasksTotal
      }
    ) }),
    /* @__PURE__ */ jsxs10(Box10, { flexDirection: "row", flexGrow: 1, height: mainAreaHeight, children: [
      /* @__PURE__ */ jsx10(
        Box10,
        {
          width: `${TASK_PANEL_WIDTH_PERCENT}%`,
          borderStyle: "single",
          borderColor: "gray",
          flexShrink: 0,
          paddingX: 1,
          children: /* @__PURE__ */ jsx10(
            TaskListPanel,
            {
              tasks,
              activeTaskId,
              selectedIndex: selectedTaskIndex,
              onSelectTask,
              maxHeight: taskListMaxHeight
            }
          )
        }
      ),
      /* @__PURE__ */ jsx10(
        Box10,
        {
          flexGrow: 1,
          borderStyle: "single",
          borderColor: "gray",
          paddingX: 1,
          children: /* @__PURE__ */ jsx10(
            OutputPanel,
            {
              lines: output,
              maxVisibleLines: outputMaxLines,
              autoScroll: true,
              isFocused: false
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ jsx10(Box10, { flexShrink: 0, children: /* @__PURE__ */ jsx10(
      StatusBar,
      {
        isRunning,
        isPaused,
        currentTaskId: activeTaskId,
        elapsedSeconds
      }
    ) })
  ] });
}

// src/components/HelpModal.tsx
import { Box as Box11, Text as Text10 } from "ink";
import { jsx as jsx11, jsxs as jsxs11 } from "react/jsx-runtime";
var SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "\u2191/\u2193", description: "Navigate task list" },
      { key: "Enter", description: "Start workflow / Select story" },
      { key: "PgUp/PgDn", description: "Scroll output panel" }
    ]
  },
  {
    title: "Workflow Control",
    shortcuts: [
      { key: "p", description: "Pause workflow (finish current task, then stop)" },
      { key: "r", description: "Resume / Start workflow" }
    ]
  },
  {
    title: "General",
    shortcuts: [
      { key: "s", description: "Open story picker" },
      { key: "q", description: "Quit application" },
      { key: "?", description: "Toggle this help" },
      { key: "Esc", description: "Close modal / Cancel" }
    ]
  }
];
function ShortcutRow({ shortcut }) {
  return /* @__PURE__ */ jsxs11(Box11, { children: [
    /* @__PURE__ */ jsx11(Box11, { width: 12, children: /* @__PURE__ */ jsx11(Text10, { color: "cyan", children: shortcut.key }) }),
    /* @__PURE__ */ jsx11(Text10, { children: shortcut.description })
  ] });
}
function ShortcutGroupDisplay({ group }) {
  return /* @__PURE__ */ jsxs11(Box11, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsx11(Text10, { bold: true, color: "yellow", children: group.title }),
    /* @__PURE__ */ jsx11(Box11, { flexDirection: "column", paddingLeft: 2, children: group.shortcuts.map((shortcut) => /* @__PURE__ */ jsx11(ShortcutRow, { shortcut }, shortcut.key)) })
  ] });
}
function HelpModal({ onClose: _onClose }) {
  void _onClose;
  return /* @__PURE__ */ jsxs11(
    Box11,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "cyan",
      padding: 1,
      marginX: 2,
      marginY: 1,
      children: [
        /* @__PURE__ */ jsx11(Box11, { marginBottom: 1, children: /* @__PURE__ */ jsx11(Text10, { bold: true, color: "cyan", children: "Help - Keyboard Shortcuts" }) }),
        SHORTCUT_GROUPS.map((group) => /* @__PURE__ */ jsx11(ShortcutGroupDisplay, { group }, group.title)),
        /* @__PURE__ */ jsx11(Box11, { marginTop: 1, borderStyle: "single", borderTop: true, borderBottom: false, borderLeft: false, borderRight: false, children: /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "Press Esc or ? to close this help" }) })
      ]
    }
  );
}

// src/hooks/useKeyboard.ts
import { useCallback } from "react";
import { useInput as useInput3, useApp } from "ink";
function useKeyboard({
  view,
  isRunning,
  isPaused,
  taskCount,
  selectedTaskIndex,
  storyCount,
  selectedStoryIndex,
  onPause,
  onResume,
  onStart,
  onOpenStoryPicker,
  onCloseStoryPicker,
  onSelectStory,
  onConfirmStorySelection,
  onCreateStory,
  onSetView,
  onSelectTask,
  enabled = true
}) {
  const { exit } = useApp();
  const handleTaskNavigation = useCallback(
    (direction) => {
      if (taskCount === 0) return;
      const newIndex = direction === "up" ? Math.max(0, selectedTaskIndex - 1) : Math.min(taskCount - 1, selectedTaskIndex + 1);
      onSelectTask(newIndex);
    },
    [taskCount, selectedTaskIndex, onSelectTask]
  );
  const handleStoryNavigation = useCallback(
    (direction) => {
      if (storyCount === 0) return;
      const newIndex = direction === "up" ? Math.max(0, selectedStoryIndex - 1) : Math.min(storyCount - 1, selectedStoryIndex + 1);
      onSelectStory(newIndex);
    },
    [storyCount, selectedStoryIndex, onSelectStory]
  );
  useInput3(
    (input, key) => {
      if (view === "help") {
        if (key.escape || input === "?") {
          onSetView("dashboard");
        }
        return;
      }
      if (view === "picker") {
        if (key.upArrow) {
          handleStoryNavigation("up");
          return;
        }
        if (key.downArrow) {
          handleStoryNavigation("down");
          return;
        }
        if (key.return) {
          onConfirmStorySelection();
          return;
        }
        if (key.escape) {
          onCloseStoryPicker();
          return;
        }
        if (input === "q") {
          exit();
          return;
        }
        if (input === "n" && onCreateStory) {
          onCreateStory();
          return;
        }
        return;
      }
      if (view === "dashboard") {
        if (key.upArrow) {
          handleTaskNavigation("up");
          return;
        }
        if (key.downArrow) {
          handleTaskNavigation("down");
          return;
        }
        if (input === "p" && isRunning && !isPaused) {
          onPause();
          return;
        }
        if (input === "r") {
          if (isPaused) {
            onResume();
          } else if (!isRunning) {
            onStart();
          }
          return;
        }
        if (key.return && !isRunning) {
          onStart();
          return;
        }
        if (input === "s") {
          onOpenStoryPicker();
          return;
        }
        if (input === "?") {
          onSetView("help");
          return;
        }
        if (input === "q") {
          exit();
          return;
        }
      }
    },
    { isActive: enabled }
  );
  return {};
}

// src/hooks/useFileWatcher.ts
import { useEffect as useEffect2, useRef as useRef2, useCallback as useCallback2 } from "react";
import { join as join3 } from "path";

// src/services/fileWatcher.ts
import * as chokidar from "chokidar";
import { join } from "path";
var DEFAULT_DEBOUNCE_MS = 100;
var FileWatcherImpl = class {
  watcher = null;
  workflowCallbacks = /* @__PURE__ */ new Set();
  tasksCallbacks = /* @__PURE__ */ new Set();
  watchedDir = null;
  debounceMs;
  // Debounce timers for each file type
  workflowDebounceTimer = null;
  tasksDebounceTimer = null;
  /**
   * Creates a new FileWatcher instance.
   *
   * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
   */
  constructor(debounceMs = DEFAULT_DEBOUNCE_MS) {
    this.debounceMs = debounceMs;
  }
  /**
   * Starts watching a story directory for changes.
   *
   * Watches workflow-state.json and tasks.md files specifically.
   * If already watching, stops the previous watcher first.
   *
   * @param storyDir - Path to the story directory to watch
   */
  watch(storyDir) {
    if (this.watcher) {
      this.stop();
    }
    this.watchedDir = storyDir;
    const workflowStatePath = join(storyDir, "workflow-state.json");
    const tasksPath = join(storyDir, "tasks.md");
    this.watcher = chokidar.watch([workflowStatePath, tasksPath], {
      // Use polling for better cross-platform compatibility
      usePolling: false,
      // Ignore initial add events
      ignoreInitial: true,
      // Wait for write to finish
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10
      }
    });
    this.watcher.on("change", (path) => {
      this.handleFileChange(path);
    });
    this.watcher.on("add", (path) => {
      this.handleFileChange(path);
    });
    this.watcher.on("error", (error) => {
      console.error("FileWatcher error:", error.message);
    });
  }
  /**
   * Handles a file change event, dispatching to the appropriate callbacks.
   */
  handleFileChange(path) {
    const filename = path.split("/").pop() || path.split("\\").pop();
    if (filename === "workflow-state.json") {
      this.debouncedNotify("workflow");
    } else if (filename === "tasks.md") {
      this.debouncedNotify("tasks");
    }
  }
  /**
   * Notifies callbacks with debouncing to prevent duplicate events.
   */
  debouncedNotify(type) {
    if (type === "workflow") {
      if (this.workflowDebounceTimer) {
        clearTimeout(this.workflowDebounceTimer);
      }
      this.workflowDebounceTimer = setTimeout(() => {
        this.workflowDebounceTimer = null;
        this.notifyWorkflowChange();
      }, this.debounceMs);
    } else {
      if (this.tasksDebounceTimer) {
        clearTimeout(this.tasksDebounceTimer);
      }
      this.tasksDebounceTimer = setTimeout(() => {
        this.tasksDebounceTimer = null;
        this.notifyTasksChange();
      }, this.debounceMs);
    }
  }
  /**
   * Notifies all workflow change callbacks.
   */
  notifyWorkflowChange() {
    for (const callback of this.workflowCallbacks) {
      try {
        callback();
      } catch {
      }
    }
  }
  /**
   * Notifies all tasks change callbacks.
   */
  notifyTasksChange() {
    for (const callback of this.tasksCallbacks) {
      try {
        callback();
      } catch {
      }
    }
  }
  /**
   * Stops watching and cleans up resources.
   */
  stop() {
    if (this.workflowDebounceTimer) {
      clearTimeout(this.workflowDebounceTimer);
      this.workflowDebounceTimer = null;
    }
    if (this.tasksDebounceTimer) {
      clearTimeout(this.tasksDebounceTimer);
      this.tasksDebounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.watchedDir = null;
  }
  /**
   * Registers a callback for workflow-state.json changes.
   *
   * @param callback - Function to call when workflow-state.json changes
   */
  onWorkflowChange(callback) {
    this.workflowCallbacks.add(callback);
  }
  /**
   * Registers a callback for tasks.md changes.
   *
   * @param callback - Function to call when tasks.md changes
   */
  onTasksChange(callback) {
    this.tasksCallbacks.add(callback);
  }
  /**
   * Removes a workflow change callback.
   *
   * @param callback - The callback to remove
   */
  offWorkflowChange(callback) {
    this.workflowCallbacks.delete(callback);
  }
  /**
   * Removes a tasks change callback.
   *
   * @param callback - The callback to remove
   */
  offTasksChange(callback) {
    this.tasksCallbacks.delete(callback);
  }
  /**
   * Removes all registered callbacks.
   */
  removeAllListeners() {
    this.workflowCallbacks.clear();
    this.tasksCallbacks.clear();
  }
  /**
   * Returns whether the watcher is currently active.
   */
  isWatching() {
    return this.watcher !== null;
  }
  /**
   * Returns the currently watched directory, or null if not watching.
   */
  getWatchedDir() {
    return this.watchedDir;
  }
};
function createFileWatcher(debounceMs) {
  return new FileWatcherImpl(debounceMs);
}

// src/services/taskParser.ts
var TASK_HEADER_PATTERN = /^-\s*\[([xX\s~])\]\s*\*\*Task\s+(\d+\.\d+)\*\*:\s*(.+)$/;
var FIELD_PATTERN = /^\s*-\s*\*\*([^*]+)\*\*:\s*(.+)$/;
function parseStatusMarker(marker) {
  const normalized = marker.toLowerCase().trim();
  switch (normalized) {
    case "x":
      return "complete";
    case "~":
      return "in_progress";
    case "":
    case " ":
    default:
      return "incomplete";
  }
}
function parseTasksFile(content) {
  if (!content || !content.trim()) {
    return [];
  }
  const lines = content.split("\n");
  const tasks = [];
  let currentTask = null;
  for (const line of lines) {
    const headerMatch = line.match(TASK_HEADER_PATTERN);
    if (headerMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      const statusMarker = headerMatch[1] ?? " ";
      const taskId = headerMatch[2] ?? "";
      const title = headerMatch[3] ?? "";
      currentTask = {
        id: taskId,
        title: title.trim(),
        status: parseStatusMarker(statusMarker)
      };
      continue;
    }
    if (currentTask) {
      const fieldMatch = line.match(FIELD_PATTERN);
      if (fieldMatch) {
        const fieldName = fieldMatch[1] ?? "";
        const fieldValue = fieldMatch[2] ?? "";
        const normalizedFieldName = fieldName.toLowerCase().trim();
        const trimmedValue = fieldValue.trim();
        switch (normalizedFieldName) {
          case "description":
            currentTask.description = trimmedValue;
            break;
          case "files":
            currentTask.files = trimmedValue;
            break;
          case "done when":
            currentTask.criteria = trimmedValue;
            break;
          case "dependencies":
            currentTask.dependencies = trimmedValue;
            break;
        }
      }
    }
  }
  if (currentTask) {
    tasks.push(currentTask);
  }
  return tasks;
}

// src/utils/files.ts
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join as join2 } from "path";
function readFileSafe(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
function readJsonSafe(filePath) {
  const content = readFileSafe(filePath);
  if (content === null) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function isDirectory(dirPath) {
  try {
    return existsSync(dirPath) && statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}
function getModifiedTime(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return statSync(filePath).mtime;
  } catch {
    return null;
  }
}
function listSubdirectories(dirPath) {
  try {
    if (!isDirectory(dirPath)) {
      return [];
    }
    return readdirSync(dirPath).filter((name) => {
      const fullPath = join2(dirPath, name);
      return isDirectory(fullPath) && !name.startsWith(".");
    });
  } catch {
    return [];
  }
}
function getStoryDir(projectDir2, storySlug) {
  return join2(projectDir2, "docs", "stories", storySlug);
}

// src/hooks/useFileWatcher.ts
function useFileWatcher({
  projectDir: projectDir2,
  storySlug,
  onWorkflowChange,
  onTasksChange,
  enabled = true
}) {
  const watcherRef = useRef2(null);
  const isWatchingRef = useRef2(false);
  const handleWorkflowChange = useCallback2(() => {
    if (!storySlug || !projectDir2) return;
    const storyDir = getStoryDir(projectDir2, storySlug);
    const workflowStatePath = join3(storyDir, "workflow-state.json");
    const workflowState = readJsonSafe(workflowStatePath);
    if (workflowState) {
      onWorkflowChange(workflowState);
    }
  }, [projectDir2, storySlug, onWorkflowChange]);
  const handleTasksChange = useCallback2(() => {
    if (!storySlug || !projectDir2) return;
    const storyDir = getStoryDir(projectDir2, storySlug);
    const tasksPath = join3(storyDir, "tasks.md");
    const tasksContent = readFileSafe(tasksPath);
    const tasks = tasksContent ? parseTasksFile(tasksContent) : [];
    onTasksChange(tasks);
  }, [projectDir2, storySlug, onTasksChange]);
  useEffect2(() => {
    if (watcherRef.current) {
      watcherRef.current.stop();
      watcherRef.current = null;
      isWatchingRef.current = false;
    }
    if (!enabled || !storySlug || !projectDir2) {
      return;
    }
    const watcher = createFileWatcher();
    watcherRef.current = watcher;
    watcher.onWorkflowChange(handleWorkflowChange);
    watcher.onTasksChange(handleTasksChange);
    const storyDir = getStoryDir(projectDir2, storySlug);
    watcher.watch(storyDir);
    isWatchingRef.current = true;
    return () => {
      if (watcherRef.current) {
        watcherRef.current.stop();
        watcherRef.current = null;
        isWatchingRef.current = false;
      }
    };
  }, [projectDir2, storySlug, enabled, handleWorkflowChange, handleTasksChange]);
  return {
    isWatching: isWatchingRef.current
  };
}

// src/hooks/useTimer.ts
import { useState as useState3, useEffect as useEffect3 } from "react";
function calculateElapsedSeconds(startTime) {
  if (!startTime) {
    return 0;
  }
  const now = Date.now();
  const start = startTime.getTime();
  const elapsedMs = now - start;
  return Math.max(0, Math.floor(elapsedMs / 1e3));
}
function useTimer({
  taskStartTime,
  enabled = true
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState3(
    () => calculateElapsedSeconds(taskStartTime)
  );
  useEffect3(() => {
    if (!enabled || !taskStartTime) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(calculateElapsedSeconds(taskStartTime));
    const intervalId = setInterval(() => {
      setElapsedSeconds(calculateElapsedSeconds(taskStartTime));
    }, 1e3);
    return () => {
      clearInterval(intervalId);
    };
  }, [taskStartTime, enabled]);
  return {
    elapsedSeconds
  };
}

// src/store/index.ts
import { create } from "zustand";
import { join as join4 } from "path";
import { mkdirSync, writeFileSync } from "fs";

// src/utils/slugify.ts
function slugify(title) {
  if (!title || !title.trim()) {
    return "";
  }
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
function ensureUniqueSlug(slug, existingSlugs) {
  if (!slug) {
    return "";
  }
  const normalizedSlugs = existingSlugs.map((s) => s.toLowerCase());
  const normalizedSlug = slug.toLowerCase();
  if (!normalizedSlugs.includes(normalizedSlug)) {
    return slug;
  }
  let counter = 2;
  while (normalizedSlugs.includes(`${normalizedSlug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}

// src/store/index.ts
var MAX_OUTPUT_LINES = 1e3;
var projectDir = process.cwd();
function setProjectDir(dir) {
  projectDir = dir;
}
function getProjectDir() {
  return projectDir;
}
function discoverStories() {
  const storiesDir = join4(projectDir, "docs", "stories");
  const slugs = listSubdirectories(storiesDir);
  const stories = [];
  for (const slug of slugs) {
    const storyDir = getStoryDir(projectDir, slug);
    const workflowStatePath = join4(storyDir, "workflow-state.json");
    const tasksPath = join4(storyDir, "tasks.md");
    const workflowState = readJsonSafe(workflowStatePath);
    if (!workflowState) {
      continue;
    }
    const tasksContent = readFileSafe(tasksPath);
    const tasks = tasksContent ? parseTasksFile(tasksContent) : [];
    const tasksComplete = tasks.filter((t) => t.status === "complete").length;
    const tasksTotal = tasks.length;
    const updatedAt = getModifiedTime(workflowStatePath) ?? /* @__PURE__ */ new Date();
    stories.push({
      slug,
      title: workflowState.story,
      phase: workflowState.currentPhase,
      tasksComplete,
      tasksTotal,
      updatedAt
    });
  }
  stories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return stories;
}
function loadStoryBySlug(slug) {
  const storyDir = getStoryDir(projectDir, slug);
  const workflowStatePath = join4(storyDir, "workflow-state.json");
  const tasksPath = join4(storyDir, "tasks.md");
  const workflowState = readJsonSafe(workflowStatePath);
  const tasksContent = readFileSafe(tasksPath);
  const tasks = tasksContent ? parseTasksFile(tasksContent) : [];
  return { workflowState, tasks };
}
var useTUIStore = create((set, get) => ({
  // ─────────────────────────────────────────────────────────────────
  // Story State
  // ─────────────────────────────────────────────────────────────────
  stories: [],
  currentStory: null,
  // ─────────────────────────────────────────────────────────────────
  // Task State
  // ─────────────────────────────────────────────────────────────────
  tasks: [],
  activeTaskId: null,
  selectedTaskIndex: 0,
  // ─────────────────────────────────────────────────────────────────
  // Process State
  // ─────────────────────────────────────────────────────────────────
  isRunning: false,
  isPaused: false,
  output: [],
  currentProcess: null,
  // ─────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────
  view: "picker",
  // ─────────────────────────────────────────────────────────────────
  // Timing
  // ─────────────────────────────────────────────────────────────────
  taskStartTime: null,
  // ─────────────────────────────────────────────────────────────────
  // Actions - Story
  // ─────────────────────────────────────────────────────────────────
  loadStory: async (slug) => {
    const { workflowState, tasks } = loadStoryBySlug(slug);
    if (workflowState) {
      set({
        currentStory: workflowState,
        tasks,
        selectedTaskIndex: 0,
        activeTaskId: null,
        output: [],
        isRunning: false,
        isPaused: false,
        taskStartTime: null,
        view: "dashboard"
      });
    }
  },
  refreshStories: async () => {
    const stories = discoverStories();
    set({ stories });
  },
  createStory: async (title) => {
    const existingSlugs = get().stories.map((s) => s.slug);
    const baseSlug = slugify(title);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);
    const storyDir = getStoryDir(projectDir, slug);
    mkdirSync(storyDir, { recursive: true });
    const initialState = {
      story: title,
      slug,
      source: "direct",
      currentPhase: "understand",
      completedPhases: [],
      startedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeFileSync(
      join4(storyDir, "workflow-state.json"),
      JSON.stringify(initialState, null, 2)
    );
    await get().refreshStories();
    await get().loadStory(slug);
    return slug;
  },
  // ─────────────────────────────────────────────────────────────────
  // Actions - Workflow
  // ─────────────────────────────────────────────────────────────────
  startWorkflow: async () => {
    const { tasks } = get();
    const nextTask = tasks.find(
      (t) => t.status === "incomplete" || t.status === "in_progress"
    );
    if (nextTask) {
      set({
        isRunning: true,
        isPaused: false,
        activeTaskId: nextTask.id,
        taskStartTime: /* @__PURE__ */ new Date()
      });
    }
  },
  pauseWorkflow: () => {
    set({ isPaused: true });
  },
  resumeWorkflow: async () => {
    const { isRunning, tasks } = get();
    set({ isPaused: false });
    if (!isRunning) {
      const nextTask = tasks.find(
        (t) => t.status === "incomplete" || t.status === "in_progress"
      );
      if (nextTask) {
        set({
          isRunning: true,
          activeTaskId: nextTask.id,
          taskStartTime: /* @__PURE__ */ new Date()
        });
      }
    }
  },
  startEngineeringWorkflow: async () => {
    set({
      isRunning: true,
      isPaused: false,
      activeTaskId: null,
      // No specific task - running the full workflow
      taskStartTime: /* @__PURE__ */ new Date()
    });
  },
  stopWorkflow: () => {
    set({
      isRunning: false,
      isPaused: false,
      activeTaskId: null,
      taskStartTime: null
    });
  },
  // ─────────────────────────────────────────────────────────────────
  // Actions - Output
  // ─────────────────────────────────────────────────────────────────
  appendOutput: (text) => {
    set((state) => {
      const newLines = text.split("\n");
      let updatedOutput = [...state.output];
      if (updatedOutput.length > 0 && !text.startsWith("\n")) {
        const lastIndex = updatedOutput.length - 1;
        const firstNewLine = newLines[0];
        if (firstNewLine !== void 0 && updatedOutput[lastIndex] !== void 0) {
          updatedOutput[lastIndex] += firstNewLine;
        }
        newLines.shift();
      }
      updatedOutput = [...updatedOutput, ...newLines];
      if (updatedOutput.length > MAX_OUTPUT_LINES) {
        updatedOutput = updatedOutput.slice(-MAX_OUTPUT_LINES);
      }
      return { output: updatedOutput };
    });
  },
  clearOutput: () => {
    set({ output: [] });
  },
  // ─────────────────────────────────────────────────────────────────
  // Actions - Navigation
  // ─────────────────────────────────────────────────────────────────
  selectTask: (index) => {
    const { tasks } = get();
    const clampedIndex = Math.max(0, Math.min(index, tasks.length - 1));
    set({ selectedTaskIndex: clampedIndex });
  },
  setView: (view) => {
    set({ view });
  }
}));

// src/services/claudeRunner.ts
import { execaCommand } from "execa";
import { writeFileSync as writeFileSync2, unlinkSync } from "fs";
import { join as join5 } from "path";
import { tmpdir } from "os";
var ClaudeRunnerImpl = class {
  process = null;
  outputCallbacks = /* @__PURE__ */ new Set();
  exitCallbacks = /* @__PURE__ */ new Set();
  claudeBin;
  tempFile = null;
  /**
   * Creates a new ClaudeRunner instance.
   *
   * @param claudeBin - Path to the Claude CLI binary (default: 'claude')
   */
  constructor(claudeBin = "claude") {
    this.claudeBin = claudeBin;
  }
  /**
   * Spawns a new Claude CLI process with the given prompt.
   *
   * If a process is already running, it will be killed first.
   *
   * Uses a temp file approach for stdin because execa's direct stdin input
   * doesn't work reliably with Claude CLI for long prompts.
   *
   * @param prompt - The prompt to send to Claude
   * @param options - Optional spawn options (cwd, env)
   */
  spawn(prompt, options = {}) {
    if (this.process) {
      this.kill();
    }
    const env = {
      ...process.env,
      FORCE_COLOR: "1",
      ...options.env
    };
    try {
      this.tempFile = join5(tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
      writeFileSync2(this.tempFile, prompt);
      const command = `cat "${this.tempFile}" | ${this.claudeBin} --print`;
      this.process = execaCommand(command, {
        shell: true,
        env,
        cwd: options.cwd,
        // Don't throw on non-zero exit (we handle it in onExit)
        reject: false,
        // Buffer output for final capture, but also stream it
        buffer: true
      });
      if (!this.process.pid) {
        this.notifyOutput("[Error] Process failed to start - no PID assigned\n");
        this.cleanupTempFile();
        this.notifyExit(1);
        return;
      }
      this.notifyOutput(`[Debug] Process started with PID: ${this.process.pid}
`);
      if (this.process.stdout) {
        this.setupStreamHandler(this.process.stdout);
      }
      if (this.process.stderr) {
        this.setupStreamHandler(this.process.stderr);
      }
      this.process.then((result) => {
        this.cleanupTempFile();
        const exitCode = result.exitCode ?? 1;
        this.notifyExit(exitCode);
        this.process = null;
      }).catch((error) => {
        this.cleanupTempFile();
        this.notifyOutput(`[Error] Process error: ${error.message}
`);
        if (error.stderr) {
          this.notifyOutput(`[Error] stderr: ${error.stderr}
`);
        }
        const exitCode = error.exitCode ?? 1;
        this.notifyExit(exitCode);
        this.process = null;
      });
    } catch (error) {
      this.cleanupTempFile();
      this.notifyOutput(`[Error] Failed to spawn process: ${error instanceof Error ? error.message : String(error)}
`);
      this.notifyExit(1);
    }
  }
  /**
   * Cleans up the temp file used for stdin input.
   */
  cleanupTempFile() {
    if (this.tempFile) {
      try {
        unlinkSync(this.tempFile);
      } catch {
      }
      this.tempFile = null;
    }
  }
  /**
   * Sets up a stream handler that converts chunks to strings and notifies callbacks.
   */
  setupStreamHandler(stream) {
    stream.on("data", (chunk) => {
      const text = chunk.toString();
      this.notifyOutput(text);
    });
  }
  /**
   * Notifies all registered output callbacks.
   */
  notifyOutput(data) {
    for (const callback of this.outputCallbacks) {
      try {
        callback(data);
      } catch {
      }
    }
  }
  /**
   * Notifies all registered exit callbacks.
   */
  notifyExit(code) {
    for (const callback of this.exitCallbacks) {
      try {
        callback(code);
      } catch {
      }
    }
  }
  /**
   * Kills the running process if one exists.
   *
   * Sends SIGTERM for graceful shutdown.
   */
  kill() {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
    this.cleanupTempFile();
  }
  /**
   * Returns whether a Claude process is currently running.
   */
  isRunning() {
    return this.process !== null;
  }
  /**
   * Registers a callback to receive stdout/stderr output.
   *
   * @param callback - Function to call with output data
   */
  onOutput(callback) {
    this.outputCallbacks.add(callback);
  }
  /**
   * Registers a callback for process exit.
   *
   * @param callback - Function to call with exit code
   */
  onExit(callback) {
    this.exitCallbacks.add(callback);
  }
  /**
   * Removes an output callback.
   *
   * @param callback - The callback to remove
   */
  offOutput(callback) {
    this.outputCallbacks.delete(callback);
  }
  /**
   * Removes an exit callback.
   *
   * @param callback - The callback to remove
   */
  offExit(callback) {
    this.exitCallbacks.delete(callback);
  }
  /**
   * Removes all registered callbacks.
   */
  removeAllListeners() {
    this.outputCallbacks.clear();
    this.exitCallbacks.clear();
  }
};
var activeRunners = /* @__PURE__ */ new Set();
function createClaudeRunner(claudeBin) {
  const runner = new ClaudeRunnerImpl(claudeBin);
  activeRunners.add(runner);
  return runner;
}
function unregisterRunner(runner) {
  activeRunners.delete(runner);
}
function killAllRunners() {
  for (const runner of activeRunners) {
    if (runner.isRunning()) {
      runner.kill();
    }
  }
}

// src/services/promptBuilder.ts
import { join as join6 } from "path";
function buildWorkflowStartPrompt(context) {
  const { story, projectDir: projectDir2 } = context;
  const storyDir = join6(projectDir2, "docs", "stories", story.slug);
  const researchContent = readFileSafe(join6(storyDir, "research-notes.md"));
  const designContent = readFileSafe(join6(storyDir, "design.md"));
  const prompt = `You are working on an engineering story. Please work through the engineering process phases to generate implementation tasks.

## Story Information

**Title**: ${story.story}
**Slug**: ${story.slug}
**Story Directory**: docs/stories/${story.slug}/
**Current Phase**: ${story.currentPhase}
**Completed Phases**: ${story.completedPhases.length > 0 ? story.completedPhases.join(", ") : "none"}
**Started**: ${story.startedAt}
${story.source !== "direct" ? `**Source**: ${story.source}` : ""}
${story.jtbd ? `
## Jobs To Be Done (JTBD)
- **Context**: ${story.jtbd.context}
- **Job**: ${story.jtbd.job}
- **Outcome**: ${story.jtbd.outcome}
` : ""}
${researchContent ? `
## Existing Research Notes
Research notes already exist at docs/stories/${story.slug}/research-notes.md
` : ""}
${designContent ? `
## Existing Design Document
Design document already exists at docs/stories/${story.slug}/design.md
` : ""}

## Instructions

Work through the 8-phase engineering process starting from the "${story.currentPhase}" phase:

1. **Understand** - Comprehend requirements, identify gaps
2. **Research** - Explore codebase, verify assumptions
3. **Scope** - Define boundaries, minimal implementation
4. **Design** - Architecture decisions, document approach
5. **Decompose** - Break into implementable tasks
6. **Implement** - Write code and tests
7. **Validate** - Review, test, verify criteria
8. **Deploy** - Release and monitor

The story directory and workflow-state.json already exist at docs/stories/${story.slug}/ - do not recreate them.

Your goal is to progress through the phases and generate a tasks.md file that defines the implementation work. Update the workflow-state.json as you complete each phase.

Please begin by analyzing the current phase and determining what needs to be done.`;
  return prompt;
}

// src/components/App.tsx
import { jsx as jsx12, jsxs as jsxs12 } from "react/jsx-runtime";
function App({
  projectDir: projectDir2,
  initialStory,
  headless = false
}) {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState4(0);
  const [isCreatingStory, setIsCreatingStory] = useState4(false);
  const [createError, setCreateError] = useState4(null);
  const [isStartingWorkflow, setIsStartingWorkflow] = useState4(false);
  const claudeRunnerRef = useRef3(null);
  const stories = useTUIStore((state) => state.stories);
  const currentStory = useTUIStore((state) => state.currentStory);
  const tasks = useTUIStore((state) => state.tasks);
  const activeTaskId = useTUIStore((state) => state.activeTaskId);
  const selectedTaskIndex = useTUIStore((state) => state.selectedTaskIndex);
  const isRunning = useTUIStore((state) => state.isRunning);
  const isPaused = useTUIStore((state) => state.isPaused);
  const output = useTUIStore((state) => state.output);
  const view = useTUIStore((state) => state.view);
  const taskStartTime = useTUIStore((state) => state.taskStartTime);
  const loadStory = useTUIStore((state) => state.loadStory);
  const refreshStories = useTUIStore((state) => state.refreshStories);
  const createStory = useTUIStore((state) => state.createStory);
  const startWorkflow = useTUIStore((state) => state.startWorkflow);
  const pauseWorkflow = useTUIStore((state) => state.pauseWorkflow);
  const resumeWorkflow = useTUIStore((state) => state.resumeWorkflow);
  const startEngineeringWorkflow = useTUIStore((state) => state.startEngineeringWorkflow);
  const stopWorkflow = useTUIStore((state) => state.stopWorkflow);
  const appendOutput = useTUIStore((state) => state.appendOutput);
  const selectTask = useTUIStore((state) => state.selectTask);
  const setView = useTUIStore((state) => state.setView);
  const [isInitialized, setIsInitialized] = useState4(false);
  const [initError, setInitError] = useState4(null);
  useEffect4(() => {
    const initialize = async () => {
      try {
        setProjectDir(projectDir2);
        await refreshStories();
        if (initialStory) {
          const updatedStories = useTUIStore.getState().stories;
          const storyExists = updatedStories.some((s) => s.slug === initialStory);
          if (storyExists) {
            await loadStory(initialStory);
          } else {
            setInitError(`Story not found: ${initialStory}`);
            setIsInitialized(true);
            return;
          }
        }
        setIsInitialized(true);
      } catch (error) {
        setInitError(error instanceof Error ? error.message : "Unknown error");
        setIsInitialized(true);
      }
    };
    void initialize();
  }, [projectDir2, initialStory, refreshStories, loadStory]);
  const appendOutputRef = useRef3(appendOutput);
  const stopWorkflowRef = useRef3(stopWorkflow);
  useEffect4(() => {
    appendOutputRef.current = appendOutput;
    stopWorkflowRef.current = stopWorkflow;
  }, [appendOutput, stopWorkflow]);
  useEffect4(() => {
    claudeRunnerRef.current = createClaudeRunner();
    const handleOutput = (text) => {
      appendOutputRef.current(text);
    };
    const handleExit = (code) => {
      setIsStartingWorkflow(false);
      stopWorkflowRef.current();
      if (code !== 0) {
        appendOutputRef.current(`
[Process exited with code ${code}]`);
      }
    };
    claudeRunnerRef.current.onOutput(handleOutput);
    claudeRunnerRef.current.onExit(handleExit);
    return () => {
      if (claudeRunnerRef.current) {
        claudeRunnerRef.current.removeAllListeners();
        claudeRunnerRef.current.kill();
        unregisterRunner(claudeRunnerRef.current);
        claudeRunnerRef.current = null;
      }
    };
  }, []);
  const handleStartEngineeringWorkflow = useCallback3(async () => {
    if (!currentStory) {
      appendOutput("[Error] No current story selected\n");
      return;
    }
    if (!claudeRunnerRef.current) {
      appendOutput("[Error] Claude runner not initialized\n");
      return;
    }
    setIsStartingWorkflow(true);
    await startEngineeringWorkflow();
    const prompt = buildWorkflowStartPrompt({
      story: currentStory,
      projectDir: getProjectDir()
    });
    appendOutput("Starting engineering workflow...\n");
    appendOutput(`[Debug] Working directory: ${getProjectDir()}
`);
    appendOutput(`[Debug] Spawning claude with prompt (${prompt.length} chars)...
`);
    try {
      claudeRunnerRef.current.spawn(prompt, {
        cwd: getProjectDir()
      });
      appendOutput("[Debug] Spawn initiated\n");
    } catch (error) {
      appendOutput(`[Error] Failed to spawn claude: ${error instanceof Error ? error.message : String(error)}
`);
      setIsStartingWorkflow(false);
      stopWorkflow();
    }
  }, [currentStory, startEngineeringWorkflow, appendOutput, stopWorkflow]);
  const handleWorkflowChange = useCallback3((state) => {
    useTUIStore.setState({ currentStory: state });
  }, []);
  const handleTasksChange = useCallback3((newTasks) => {
    useTUIStore.setState({ tasks: newTasks });
  }, []);
  useFileWatcher({
    projectDir: getProjectDir(),
    storySlug: currentStory?.slug ?? null,
    onWorkflowChange: handleWorkflowChange,
    onTasksChange: handleTasksChange,
    enabled: isInitialized && currentStory !== null && !headless
  });
  const { elapsedSeconds } = useTimer({
    taskStartTime,
    enabled: isRunning && !headless
  });
  const handleOpenStoryPicker = useCallback3(() => {
    setView("picker");
    setSelectedStoryIndex(0);
  }, [setView]);
  const handleCloseStoryPicker = useCallback3(() => {
    if (currentStory) {
      setView("dashboard");
    }
  }, [currentStory, setView]);
  const handleConfirmStorySelection = useCallback3(async () => {
    if (stories.length > 0 && selectedStoryIndex < stories.length) {
      const story = stories[selectedStoryIndex];
      if (story) {
        await loadStory(story.slug);
      }
    }
  }, [stories, selectedStoryIndex, loadStory]);
  const handleSelectTask = useCallback3(
    (index) => {
      selectTask(index);
    },
    [selectTask]
  );
  const handleCreateStory = useCallback3(() => {
    setIsCreatingStory(true);
    setCreateError(null);
  }, []);
  const handleSubmitCreate = useCallback3(
    async (title) => {
      const trimmedTitle = title.trim();
      if (trimmedTitle === "") {
        setCreateError("Story title cannot be empty");
        return;
      }
      try {
        await createStory(trimmedTitle);
        setIsCreatingStory(false);
        setCreateError(null);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Failed to create story");
      }
    },
    [createStory]
  );
  const handleCancelCreate = useCallback3(() => {
    setIsCreatingStory(false);
    setCreateError(null);
  }, []);
  const handleStart = useCallback3(async () => {
    if (tasks.length === 0) {
      await handleStartEngineeringWorkflow();
    } else {
      await startWorkflow();
    }
  }, [tasks.length, handleStartEngineeringWorkflow, startWorkflow]);
  useKeyboard({
    view,
    isRunning,
    isPaused,
    taskCount: tasks.length,
    selectedTaskIndex,
    storyCount: stories.length,
    selectedStoryIndex,
    onPause: pauseWorkflow,
    onResume: resumeWorkflow,
    onStart: handleStart,
    onOpenStoryPicker: handleOpenStoryPicker,
    onCloseStoryPicker: handleCloseStoryPicker,
    onSelectStory: setSelectedStoryIndex,
    onConfirmStorySelection: handleConfirmStorySelection,
    onCreateStory: isCreatingStory ? void 0 : handleCreateStory,
    onSetView: setView,
    onSelectTask: handleSelectTask,
    enabled: isInitialized && !headless && !isCreatingStory
  });
  if (!isInitialized) {
    return /* @__PURE__ */ jsx12(Box12, { flexDirection: "column", padding: 1, children: /* @__PURE__ */ jsx12(Text11, { children: "Loading..." }) });
  }
  if (initError) {
    return /* @__PURE__ */ jsx12(Box12, { flexDirection: "column", padding: 1, children: /* @__PURE__ */ jsxs12(Text11, { color: "red", children: [
      "Error: ",
      initError
    ] }) });
  }
  if (view === "help" && currentStory) {
    return /* @__PURE__ */ jsx12(Box12, { flexDirection: "column", children: /* @__PURE__ */ jsx12(HelpModal, { onClose: () => setView("dashboard") }) });
  }
  if (view === "picker" || !currentStory) {
    return /* @__PURE__ */ jsx12(
      StoryPicker,
      {
        stories,
        selectedIndex: selectedStoryIndex,
        onSelect: (slug) => void loadStory(slug),
        onCancel: handleCloseStoryPicker,
        isCreating: isCreatingStory,
        onSubmitCreate: handleSubmitCreate,
        onCancelCreate: handleCancelCreate,
        createError
      }
    );
  }
  return /* @__PURE__ */ jsx12(
    Dashboard,
    {
      story: currentStory,
      tasks,
      output,
      isRunning,
      isPaused,
      activeTaskId,
      selectedTaskIndex,
      onSelectTask: (id) => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index >= 0) {
          selectTask(index);
        }
      },
      elapsedSeconds,
      isStartingWorkflow
    }
  );
}

// src/index.tsx
import { jsx as jsx13 } from "react/jsx-runtime";
var inkInstance = null;
function validateStory(projectDir2, storySlug) {
  const storyDir = join7(projectDir2, "docs", "stories", storySlug);
  const workflowStatePath = join7(storyDir, "workflow-state.json");
  if (!existsSync2(storyDir)) {
    return `Story not found: ${storySlug}`;
  }
  if (!existsSync2(workflowStatePath)) {
    return `Invalid story (missing workflow-state.json): ${storySlug}`;
  }
  return null;
}
async function renderApp(options) {
  const { projectDir: projectDir2, initialStory, headless } = options;
  const cleanup = () => {
    killAllRunners();
    if (inkInstance) {
      inkInstance.unmount();
      inkInstance = null;
    }
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  if (initialStory) {
    const validationError = validateStory(projectDir2, initialStory);
    if (validationError) {
      console.error(`Error: ${validationError}`);
      process.exit(1);
    }
  }
  inkInstance = render(
    /* @__PURE__ */ jsx13(
      App,
      {
        projectDir: projectDir2,
        initialStory,
        headless
      }
    )
  );
  if (headless) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    cleanup();
    return;
  }
  await inkInstance.waitUntilExit();
}
export {
  renderApp
};
//# sourceMappingURL=index.js.map