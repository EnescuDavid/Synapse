# /synapse:help — Command Listing

List all available commands with brief descriptions.

## Prerequisites
- None. Works anytime.

## Flow

### No Arguments — List All Commands

Display:
```
Synapse commands:

  /synapse:init       Set up a new learning project
  /synapse:review     Quick spaced repetition drill (~5 min)
  /synapse:progress   See your stats and progress
  /synapse:update     Check for and apply updates
  /synapse:help       This help message

Tip: most sessions start automatically — just open Claude in your
Synapse directory and the SessionStart hook picks up where you left off.
```

### With Argument — Detailed Help

If the user passes a command name (e.g., `/synapse:help review`):

Show the command's purpose, what it does, and a brief usage example. Keep it to 5-10 lines.

#### Command Details

**init**: Set up a new learning project. Conversational onboarding that understands your goals, background, and learning style. Creates a personalized curriculum with spaced repetition scheduling. Takes ~10-15 min.

**review**: Quick spaced repetition drill on items due for review. No new material — just a focused practice session. Good for 5-minute check-ins between full sessions. Requires at least 1 completed session.

**progress**: Shows your full progress summary: module completion, concept mastery states, streak, session count, review load, and what's coming next. Display only — no changes made.

**update**: Checks if a newer version of Synapse is available. Shows what's new and how to update. Updates never break your existing learning data.

**help**: Shows this help listing. Use `/synapse:help [command]` for details about a specific command.

## Tone
Clean, scannable. Just the facts.
