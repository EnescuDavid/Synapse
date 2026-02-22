# /synapse:review — Quick Spaced Repetition Drill

FSRS-driven review of due items only. No new material. Quick 5-minute session.

## Prerequisites
- Synapse project must be initialized (check for `.learning/state.json`)
- At least 1 completed session (otherwise nothing to review)

## Flow

1. **Detect runtime** (via Bash): `bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh` — returns `node`, `python3`, or `python`
2. **Get review queue** (via Bash): `node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js queue --state .learning/state.json` (or `python3 ...fsrs-helper.py` if runtime is python)

> **IMPORTANT**: Always call FSRS scripts as CLI commands via Bash. Never require/import them directly.
3. **If no items due**:
   - Tell learner: "Nothing to review right now! Next review due [date from upcoming]."
   - Offer: "Want to start a regular session instead?"
   - Stop here.
4. **If items due**:
   - Count: "[N] items due. Let's go."
   - Present each in quick-drill format:
     a. Read concept from `state.json` (name, Bloom's level, misconceptions)
     b. Read domain adapter for exercise format at current Bloom's level
     c. Present exercise
     d. Learner responds
     e. Grade (FSRS 1-4) — see `references/fsrs-guide.md`
     f. Call FSRS helper via Bash: `node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js review --card '<card_json>' --rating <grade>` (or python3 equivalent)
     g. Update `.learning/state.json` with new card data
     h. Brief feedback (1-2 lines max), move to next
5. **After all items**:
   - Abbreviated summary: items reviewed, grades, total time
   - Update `progress.md` (short entry tagged as `review-only`)
   - Regenerate `review-queue.json` via Bash: `node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js queue --state .learning/state.json`
   - Update streak in `state.json`

## Tone
Brisk. This is a drill, not a lesson. Keep feedback minimal. Move quickly between items.

## Summary Format
```
Review complete! [N] items in ~[N] min.

  [concept 1] — [grade label] ([interval] until next review)
  [concept 2] — [grade label] ([interval] until next review)

Streak: [N] days
```
