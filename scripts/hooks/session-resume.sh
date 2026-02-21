#!/bin/bash
# Synapse SessionStart Hook — Session Resume
# Reads state files and produces a compact briefing for Claude's context.
# If this isn't a Synapse directory, exits silently.

set -euo pipefail

STATE_FILE=".learning/state.json"
REVIEW_QUEUE=".learning/review-queue.json"
PROFILE="profile.md"
CURRICULUM="curriculum.md"
PROGRESS="progress.md"
HANDOFF=".learning/session-handoff.json"

# Check if this is a Synapse directory
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# --- Helper: read JSON field (uses python3 or node, whichever is available) ---
json_field() {
  local file="$1"
  local field="$2"
  if command -v python3 &> /dev/null; then
    python3 -c "import json,sys; d=json.load(open('$file')); print(json.dumps(d.get('$field','')))" 2>/dev/null || echo ""
  elif command -v node &> /dev/null; then
    node -e "const d=JSON.parse(require('fs').readFileSync('$file','utf8')); console.log(JSON.stringify(d['$field']||''))" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

json_nested() {
  local file="$1"
  local expr="$2"
  if command -v python3 &> /dev/null; then
    python3 -c "import json; d=json.load(open('$file')); print($expr)" 2>/dev/null || echo ""
  elif command -v node &> /dev/null; then
    node -e "const d=JSON.parse(require('fs').readFileSync('$file','utf8')); console.log($expr)" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# --- Extract state data ---
DOMAIN=$(json_field "$STATE_FILE" "domain" | tr -d '"')
STREAK_CURRENT=$(json_nested "$STATE_FILE" "d.get('streak',{}).get('current',0)" 2>/dev/null || echo "0")
STREAK_LONGEST=$(json_nested "$STATE_FILE" "d.get('streak',{}).get('longest',0)" 2>/dev/null || echo "0")
LAST_SESSION=$(json_nested "$STATE_FILE" "d.get('streak',{}).get('last_session_date','never')" 2>/dev/null || echo "never")
SESSIONS=$(json_field "$STATE_FILE" "sessions_completed" | tr -d '"')

# --- Extract learner info from profile ---
LEARNER_NAME=""
GOAL=""
METHOD=""
SESSION_LENGTH=""
if [ -f "$PROFILE" ]; then
  LEARNER_NAME=$(grep -m1 "^\*\*Topic\*\*:" "$PROFILE" 2>/dev/null | sed 's/.*: //' || echo "")
  GOAL=$(grep -m1 "^\*\*Outcome\*\*:" "$PROFILE" 2>/dev/null | sed 's/.*: //' || echo "")
  METHOD=$(grep -m1 "^\*\*Teaching method\*\*:" "$PROFILE" 2>/dev/null | sed 's/.*: //' || echo "mixed")
  SESSION_LENGTH=$(grep -m1 "^\*\*Session length\*\*:" "$PROFILE" 2>/dev/null | sed 's/.*: //' || echo "15")
fi

# --- Extract current module from curriculum ---
CURRENT_MODULE=""
if [ -f "$CURRICULUM" ]; then
  CURRENT_MODULE=$(grep -m1 "^## Module" "$CURRICULUM" 2>/dev/null | head -1 || echo "")
fi

# --- Review queue stats ---
DUE_TODAY=0
DUE_WEEK=0
AVG_R="N/A"
if [ -f "$REVIEW_QUEUE" ]; then
  DUE_TODAY=$(json_nested "$REVIEW_QUEUE" "len(d.get('due',d.get('due_today',[])))" 2>/dev/null || echo "0")
  DUE_WEEK=$(json_nested "$REVIEW_QUEUE" "d.get('stats',d.get('queue_stats',{})).get('due_this_week',0)" 2>/dev/null || echo "0")
  AVG_R=$(json_nested "$REVIEW_QUEUE" "str(round(d.get('stats',d.get('queue_stats',{})).get('average_retrievability',0)*100))+'%'" 2>/dev/null || echo "N/A")
fi

# --- Last progress entry ---
LAST_PROGRESS=""
if [ -f "$PROGRESS" ]; then
  # Get last session entry (last ## heading and a few lines after)
  LAST_PROGRESS=$(tail -20 "$PROGRESS" 2>/dev/null | head -15 || echo "No sessions yet.")
fi

# --- Streak status ---
STREAK_NOTE=""
if [ "$LAST_SESSION" != "never" ] && [ "$LAST_SESSION" != "null" ] && [ -n "$LAST_SESSION" ]; then
  LAST_SESSION_CLEAN=$(echo "$LAST_SESSION" | tr -d '"')
  if command -v python3 &> /dev/null; then
    DAYS_SINCE=$(python3 -c "
from datetime import datetime, timezone
try:
    last = datetime.fromisoformat('$LAST_SESSION_CLEAN'.replace('Z','+00:00')).date()
    today = datetime.now(timezone.utc).date()
    print((today - last).days)
except:
    print(-1)
" 2>/dev/null || echo "-1")
  elif command -v node &> /dev/null; then
    DAYS_SINCE=$(node -e "
const last = new Date('$LAST_SESSION_CLEAN');
const today = new Date();
console.log(Math.floor((today - last) / (1000*60*60*24)));
" 2>/dev/null || echo "-1")
  else
    DAYS_SINCE="-1"
  fi

  if [ "$DAYS_SINCE" -gt 2 ] 2>/dev/null; then
    STREAK_NOTE="Note: Streak reset (last session was ${DAYS_SINCE} days ago). Be encouraging."
  fi
fi

# --- Check for interrupted session ---
HANDOFF_SECTION=""
if [ -f "$HANDOFF" ]; then
  HANDOFF_SECTION=$(python3 -c "
import json
d = json.load(open('$HANDOFF'))
exercises = d.get('exercises_completed', [])
remaining = d.get('session_plan_remaining', [])
rate = d.get('running_success_rate', 0)
ex_list = ', '.join([e.get('concept','?') for e in exercises]) if exercises else 'none'
rem_list = ', '.join(remaining) if remaining else 'none'
print(f'''
INTERRUPTED SESSION — resume from handoff:
Exercises completed: {ex_list}
Remaining plan: {rem_list}
Success rate so far: {round(rate*100)}%''')
" 2>/dev/null || echo "")
fi

# --- Build output ---
cat << CONTEXT
[SYNAPSE SESSION CONTEXT]
Learner topic: ${LEARNER_NAME:-unknown}
Goal: ${GOAL:-not set}
Domain: ${DOMAIN:-general}
Teaching method: ${METHOD:-mixed} | Session target: ${SESSION_LENGTH:-15} min

Streak: ${STREAK_CURRENT:-0} days (longest: ${STREAK_LONGEST:-0}) | Sessions: ${SESSIONS:-0} completed | Last session: ${LAST_SESSION:-never}
${CURRENT_MODULE:-No module info}

Review queue: ${DUE_TODAY} items due today, ${DUE_WEEK} due this week
Average retrievability: ${AVG_R}

Last session summary:
${LAST_PROGRESS:-No sessions yet.}
${HANDOFF_SECTION:+
$HANDOFF_SECTION}
${STREAK_NOTE:+
$STREAK_NOTE}

Read the following files for full context:
- profile.md (learner preferences)
- curriculum.md (current roadmap)
- .learning/state.json (concept states for current module)
- Domain adapter: ${DOMAIN:-general}.md
[END SYNAPSE SESSION CONTEXT]
CONTEXT
