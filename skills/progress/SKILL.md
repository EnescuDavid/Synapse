---
description: "Show learning stats and progress. Use when the user wants to see how they're doing."
---

# /synapse:progress

Load and follow `${CLAUDE_PLUGIN_ROOT}/skills/synapse/workflows/progress.md`.

## Verification

Before starting, check for `.learning/state.json`. If missing, tell the user: "No Synapse project found. Run `/synapse:init` to get started."

## Runtime Detection

To determine which runtime to use for FSRS scripts:
```
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh
```
Returns: `node`, `python3`, `python`, or `none`

Use the detected runtime with the matching script extension (`.js` for node, `.py` for python3/python).
