---
description: "Personal learning tutor. Use when the user invokes any /synapse:* command or when the SessionStart hook has loaded learning context."
---

# Synapse

Personal learning tutor that builds curricula, teaches with spaced repetition (FSRS-5), and adapts to how you learn.

## Intake

Determine what the user needs:

1. If invoked via `/synapse:init` → load `workflows/init.md`
2. If invoked via `/synapse:review` → load `workflows/review.md`
3. If invoked via `/synapse:progress` → load `workflows/progress.md`
4. If invoked via `/synapse:update` → load `workflows/update.md`
5. If invoked via `/synapse:help` (with optional argument) → load `workflows/help.md`
6. If mid-session (SessionStart hook loaded context) → follow session loop below

## Session Loop

When the SessionStart hook has loaded context (indicated by `[SYNAPSE SESSION CONTEXT]` in the conversation), follow the session loop:

1. Read the injected context summary
2. Check for interrupted session (`session-handoff.json`)
3. Plan the session (inline — see `references/session-loop.md`)
4. Run the teaching loop
5. Close the session

### Quick Reference

**Teaching cycle** (per item):
- PRESENT → ENGAGE → EVALUATE → REINFORCE/CORRECT → TRANSITION

**FSRS grading** (see `references/fsrs-guide.md`):
- 1 = Again (failed), 2 = Hard (struggled), 3 = Good (target), 4 = Easy (trivial)

**Bloom's levels** (see `references/bloom-levels.md`):
- 0=Not Started, 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create

**Difficulty target**: 70-85% success rate (Zone of Proximal Development)

**FSRS helper** (always call via Bash, never require/import directly):
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js <command> <args>
```

### Mid-Session Checkpoints

After every 2-3 exercises, write `.learning/session-handoff.json` with:
- exercises_completed, session_plan_remaining, running_success_rate, observations

### Session Close (one call)

At session end, call the session-close script via Bash with session results as JSON. This handles ALL file updates deterministically in one step:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/session/session-close.js --results '<json>'
```
See `references/session-loop.md` for the JSON schema and examples. Do NOT manually edit state.json, progress.md, review-queue.json, or session-history.json at session end.

## Runtime Detection

To determine which runtime to use for FSRS scripts:
```
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh
```
Returns: `node`, `python3`, `python`, or `none`

Use the detected runtime with the matching script extension (`.js` for node, `.py` for python3/python).

## Domain Adapter

Read the learner's domain adapter from `${CLAUDE_PLUGIN_ROOT}/adapters/<domain>.md` where `<domain>` comes from `.learning/state.json` field `domain`.

## Verification

Before starting any workflow that requires an initialized project, check for `.learning/state.json`. If missing, tell the user: "No Synapse project found. Run `/synapse:init` to get started."
