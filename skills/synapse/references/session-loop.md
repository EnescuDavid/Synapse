# Session Loop Reference

The core teaching cycle that runs every session. Follow this when the SessionStart hook has loaded context.

## Session Start

1. **Read injected context** from `[SYNAPSE SESSION CONTEXT]`
2. **Check for interrupted session** — if `session-handoff.json` exists, resume from there
3. **Plan the session** (inline):
   - Query FSRS: due items from `.learning/review-queue.json`
   - Walk concept DAG: next available concepts from `state.json`
   - Budget time: reviews ~2.5 min each, new concepts ~7 min each, 2 min for open/close
4. **Determine session type**: mixed (default), review-heavy (>5 overdue), new-focused (no reviews), assessment (module complete)
5. **Greet the learner** with status and today's plan

### Greeting Template
```
Welcome back! Day [N] · Streak: [N] days · [Current Module]

Last session: [brief summary]

Today's plan (~[N] min):
  Review: [concept 1], [concept 2]
  New: [concept 3] — [brief description]

Ready?
```

### Adaptive Greeting Notes
- First session after onboarding: lighter, reference the onboarding conversation
- After streak break: "Welcome back! Your streak reset, but your knowledge didn't."
- After a strong session: reference it
- After a tough session: acknowledge it

## Teaching Loop

Repeats for each item in the session plan:

### 1. PRESENT
- Read concept info from `state.json` (Bloom's level, misconceptions)
- Read domain adapter for exercise format at this Bloom's level
- Generate exercise following adapter patterns
- If adapter specifies file creation → create exercise file
- If chat-only → present in chat

### 2. ENGAGE
- Learner responds (code, answer, explanation)
- If learner asks "why?" or "I don't understand" → explain more
- If learner says "too easy" → skip ahead, bump difficulty
- If learner says "too hard" → hint, simplify
- **Chess play-and-report**: For Apply+ chess exercises, open the position on Lichess (`chess-helper.js open`), then wait for the learner to report their moves in algebraic notation. Evaluate the reported move sequence — do not ask the learner to paste PGN or FEN back.

### 3. EVALUATE
- Check correctness per adapter's assessment rules
- If adapter has tools (coding → run tests) → run them
- Assign FSRS grade (1-4):
  - **1 (Again)**: couldn't answer, major misconception, gave up
  - **2 (Hard)**: correct but needed 2+ hints, long pause, partial answer
  - **3 (Good)**: correct with reasonable effort, maybe 1 small hint
  - **4 (Easy)**: instant correct, no hesitation
- Detect misconceptions (same error 2+ times → flag as pattern)
- Call FSRS helper via Bash (never require/import directly): `node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js review --card '<json>' --rating <grade>`
- Update `.learning/state.json` with new card data

### 4a. REINFORCE (correct/partial)
- Confirm the answer
- Connect to bigger picture
- Advance Bloom's level if ready

### 4b. CORRECT (incorrect)
- Respond based on teaching method preference:
  - **Socratic**: guiding questions
  - **Drill**: brief explanation + immediate retry
  - **Project**: explain in context
  - **Theory**: deep underlying principle
  - **Discovery**: progressive hints
  - **Mixed**: Claude picks based on error type
- Always end on a success
- Track the error for FSRS (grade 1 or 2)

### 5. TRANSITION
- Update running success rate
- Check: time limit approaching? → don't start new concepts
- Check: frustration signals? → simplify, offer break
- Move to next item or end session

## Difficulty Calibration (ZPD)

Track success rate over rolling window of last 10-15 items:
- **> 85%**: increase difficulty (next Bloom's level, harder variants, less scaffolding)
- **< 70%**: decrease difficulty (easier variants, more scaffolding, review prerequisites)
- **70-85%**: maintain — this is the sweet spot

## Interleaving

After session 3-4, mix review and new material instead of neat blocks:
```
Naive:       A → B → C        (blocked)
Interleaved: A → C-intro → B → C-exercise   (mixed)
```

First time interleaving happens, explain to the learner (once):
> "I'm mixing review and new material. This feels harder — that's a good sign. Research shows mixing topics produces better long-term retention."

Store `interleaving_explained: true` in state.json after explaining.

## Session End

1. **Finish current item** — never cut mid-exercise
2. **Session summary**:
   ```
   Session complete!

   Covered:
     ✓ Review: [concept 1] — grade [N]
     ✓ New: [concept 2] — [brief note]

   Stats:
     Success rate: [N]% | Session time: ~[N] min | Streak: [N] days

   Coming up next:
     [Next concepts] | [N] items due for review [when]
   ```
3. **Update all state files in one call** via Bash:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/session/session-close.js --results '<json>'
   ```
   This single script handles everything: state.json, progress.md, review-queue.json, session-history.json, and handoff cleanup. See the script header for the JSON schema.

   Example results JSON:
   ```json
   {
     "date": "2026-02-22",
     "duration_min": 20,
     "concepts": [
       {
         "id": "piece-values",
         "is_new": true,
         "grades": [3, 4],
         "bloom_level": "understand",
         "misconceptions": [],
         "note": "Strong grasp of relative values"
       }
     ],
     "observations": "Good first session, chess culture knowledge helps.",
     "unlocked": ["board-vision", "endgame-basics"]
   }
   ```

   For large results, write to a temp file and use `--results-file`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/session/session-close.js --results-file /tmp/synapse-results.json
   ```

## Frustration Detection

Watch for:
- 3+ incorrect in a row on same concept
- Very short responses after previously detailed ones
- Explicit: "this is too hard", "I'm confused"
- Long gaps between messages

Response: acknowledge → simplify → scaffold → offer break option

## Plateau Detection

Watch for:
- Success rate consistently > 90%
- All grades 4 (Easy)
- No Bloom's level advancements recently

Response: accelerate → skip offer → challenge with higher-level exercise

## Flow State Detection

Watch for:
- Consistent success at challenging level (70-80%, grade 3)
- Quick detailed responses, follow-up questions

Response: don't interrupt, gentle time check, extend if learner wants to continue
