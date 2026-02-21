---
description: "Quick spaced repetition drill on due items. Use when the user wants to review what they've learned."
---

# /synapse:review

Load and follow `${CLAUDE_PLUGIN_ROOT}/skills/synapse/workflows/review.md`.

## Verification

Before starting, check for `.learning/state.json`. If missing, tell the user: "No Synapse project found. Run `/synapse:init` to get started."

## Shared References

These are available in `${CLAUDE_PLUGIN_ROOT}/skills/synapse/references/`:
- `fsrs-guide.md` — FSRS grading rules
- `bloom-levels.md` — Bloom's taxonomy levels

## Runtime Detection

To determine which runtime to use for FSRS scripts:
```
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh
```
Returns: `node`, `python3`, `python`, or `none`

Use the detected runtime with the matching script extension (`.js` for node, `.py` for python3/python).

## Domain Adapter

Read the learner's domain adapter from `${CLAUDE_PLUGIN_ROOT}/adapters/<domain>.md` where `<domain>` comes from `.learning/state.json` field `domain`.
