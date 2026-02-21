---
description: "Set up a new Synapse learning project. Use when the user wants to start learning something new."
---

# /synapse:init

Load and follow `${CLAUDE_PLUGIN_ROOT}/skills/synapse/workflows/init.md`.

## Shared References

These are available in `${CLAUDE_PLUGIN_ROOT}/skills/synapse/references/`:
- `fsrs-guide.md` — FSRS grading rules
- `bloom-levels.md` — Bloom's taxonomy levels
- `session-loop.md` — session loop reference

## Runtime Detection

To determine which runtime to use for FSRS scripts:
```
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh
```
Returns: `node`, `python3`, `python`, or `none`

Use the detected runtime with the matching script extension (`.js` for node, `.py` for python3/python).

## Domain Adapter

Read the learner's domain adapter from `${CLAUDE_PLUGIN_ROOT}/adapters/<domain>.md` where `<domain>` comes from `.learning/state.json` field `domain`.
