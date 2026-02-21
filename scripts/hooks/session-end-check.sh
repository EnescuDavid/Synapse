#!/bin/bash
# Synapse Stop Hook — Session End Check
# Verifies state files were saved before allowing session to end.
# If state is stale, blocks stop so Claude can save first.

set -euo pipefail

STATE_FILE=".learning/state.json"
PROGRESS="progress.md"

# Not a Synapse directory — allow stop
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Check if state.json was modified in the last 2 minutes
STATE_FRESH=false
PROGRESS_FRESH=false

if command -v python3 &> /dev/null; then
  STATE_FRESH=$(python3 -c "
import os, time
try:
    mtime = os.path.getmtime('$STATE_FILE')
    age = time.time() - mtime
    print('true' if age < 120 else 'false')
except:
    print('false')
" 2>/dev/null || echo "false")

  if [ -f "$PROGRESS" ]; then
    PROGRESS_FRESH=$(python3 -c "
import os, time
try:
    mtime = os.path.getmtime('$PROGRESS')
    age = time.time() - mtime
    print('true' if age < 120 else 'false')
except:
    print('false')
" 2>/dev/null || echo "false")
  else
    # No progress file yet (first session not complete) — that's ok
    PROGRESS_FRESH="true"
  fi
elif command -v node &> /dev/null; then
  STATE_FRESH=$(node -e "
const fs = require('fs');
try {
  const age = (Date.now() - fs.statSync('$STATE_FILE').mtimeMs) / 1000;
  console.log(age < 120 ? 'true' : 'false');
} catch { console.log('false'); }
" 2>/dev/null || echo "false")

  if [ -f "$PROGRESS" ]; then
    PROGRESS_FRESH=$(node -e "
const fs = require('fs');
try {
  const age = (Date.now() - fs.statSync('$PROGRESS').mtimeMs) / 1000;
  console.log(age < 120 ? 'true' : 'false');
} catch { console.log('false'); }
" 2>/dev/null || echo "false")
  else
    PROGRESS_FRESH="true"
  fi
else
  # No runtime to check — allow stop
  exit 0
fi

# Both fresh — allow stop
if [ "$STATE_FRESH" = "true" ] && [ "$PROGRESS_FRESH" = "true" ]; then
  # Clean up handoff file on clean exit
  rm -f ".learning/session-handoff.json"
  exit 0
fi

# State not saved — block stop
echo "Session state may not be saved. Please update state.json and progress.md before ending the session."
exit 2
