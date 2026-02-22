# FSRS Grading Guide

Reference for how Claude assigns FSRS grades during the session loop.

## Rating Scale (1-4)

| Grade | Label | Meaning | When to Assign |
|-------|-------|---------|---------------|
| **1** | Again | Complete failure | Couldn't answer, major misconception, gave up |
| **2** | Hard | Recalled with difficulty | Correct but needed hints, long pause, partial answer |
| **3** | Good | Recalled with reasonable effort | Correct, normal effort — **the target grade** |
| **4** | Easy | Instant recall | Immediate correct, no hesitation |

## Grade Assignment Heuristics

| Scenario | Grade |
|----------|-------|
| Couldn't answer at all, or answer was fundamentally wrong | 1 (Again) |
| Got it right but needed 2+ hints, or took very long | 2 (Hard) |
| Got it right with normal effort, maybe 1 small hint | 3 (Good) |
| Instant correct response, clearly trivial for them | 4 (Easy) |
| Partially correct (right approach, wrong details) | 2 or 3 depending on how close |
| Correct but clearly guessed (admits uncertainty) | 2 (Hard) |

## Key Distinction

Grade 2 (Hard) means the learner **DID recall** but struggled. If they **couldn't recall at all**, it's grade 1 (Again). This distinction matters for scheduling:
- Again → card goes to Relearning state, short intervals
- Hard → card stays in Review, shorter interval than Good

## Card States

| State | Description | Scheduling |
|-------|-------------|-----------|
| **New** | Never reviewed | Not scheduled — enters queue when prerequisites met |
| **Learning** | First exposure | Sub-day steps |
| **Review** | Long-term rotation | Days to months between reviews |
| **Relearning** | Forgot (lapse) | Short steps, then back to Review |

## State Transitions

- **New → Learning**: first time concept appears in session
- **Learning → Review**: after Good/Easy rating (or completing learning steps)
- **Review → Review**: successful recall (rating 2+)
- **Review → Relearning**: lapse (rating 1 Again)
- **Relearning → Review**: after successful relearning step

## How to Call the FSRS Helper

**IMPORTANT**: Always call the FSRS helper as a CLI command via Bash. Do NOT require/import the JS or Python files directly — they are CLI scripts, not libraries.

First detect the runtime:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh
```
This returns `node`, `python3`, `python`, or `none`. Use the result to pick the right script.

After grading, call via Bash:
```bash
# If runtime is "node":
node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js review --card '<card_json>' --rating <grade>

# If runtime is "python3":
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.py review --card '<card_json>' --rating <grade>
```

The helper returns updated card state + next review date as JSON. Update `state.json` with the result.

For building the review queue at session start:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js queue --state .learning/state.json
```

## Mastery State Mapping

FSRS state + Bloom's level maps to display mastery:

| Display State | Condition |
|---------------|-----------|
| **Not Started** | FSRS state = New, Bloom's = 0 |
| **Learning** | FSRS state = Learning, Bloom's = Remember |
| **Familiar** | FSRS state = Review, Bloom's = Understand, S < 14 days |
| **Proficient** | FSRS state = Review, Bloom's = Apply/Analyze, S >= 14 days |
| **Mastered** | FSRS state = Review, Bloom's = Evaluate/Create, S >= 30 days |

A lapse (Review → Relearning) can demote mastery: Proficient → Familiar, Mastered → Proficient.
