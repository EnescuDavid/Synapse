# /synapse:progress — Stats and Progress Display

Show comprehensive progress summary. Display only — no state changes.

## Prerequisites
- Synapse project must be initialized (check for `.learning/state.json`)

## Flow

1. Read `state.json`, `curriculum.md`, `progress.md` (recent entries)
2. Compile and display progress

## Display Format

```yaml
Progress: [Goal from profile.md]

Module progress:
  ✓ Module 1: [Name] ([N]/[N] concepts)
  ▶ Module 2: [Name] ([N]/[N] concepts)
    Module 3: [Name] (not started)
    ...

Current module: [Name]
  Not Started: [N] concepts
  Learning: [N] concepts
  Familiar: [N] concepts
  Proficient: [N] concepts
  Mastered: [N] concepts

Stats:
  Sessions completed: [N]
  Streak: [N] days (longest: [N])
  Total concepts learned: [N]
  Average success rate: [N]%
  Estimated sessions remaining: ~[N]

Review load:
  Due today: [N] items
  Due this week: [N] items

Next session: Review [concepts] + New: [concept]
```

## Computation

### Module Progress
- Walk `state.json` concepts grouped by module
- Count by mastery_state: not_started, learning, familiar, proficient, mastered
- Module complete when all concepts are at least "familiar"
- Current module: first incomplete module

### Stats
- `sessions_completed` from state.json
- `streak.current` and `streak.longest` from state.json
- Total concepts learned: count of concepts with mastery_state != "not_started"
- Average success rate: from recent session history or rolling calibration window
- Estimated remaining: (total concepts - learned concepts) / avg concepts per session

### Review Load
- Read `.learning/review-queue.json` for due counts
- If file is stale, regenerate via Bash: `node ${CLAUDE_PLUGIN_ROOT}/scripts/fsrs/fsrs-helper.js queue --state .learning/state.json`

## Tone
Informational. Clean, scannable. Only add commentary if something is notable (long streak, struggling area, milestone approaching).
