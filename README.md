# Synapse

Turn any directory into a structured learning environment.

Synapse is a Claude Code plugin that builds personalized curricula,
teaches you session by session with spaced repetition (FSRS-5),
adapts to your mistakes, and picks up exactly where you left off.

## Install

```
/plugin marketplace add davidenescu/synapse
/plugin install synapse
```

## Quick Start

```
mkdir ~/learning/python && cd ~/learning/python
/synapse:init
```

## What It Does

- **Conversational onboarding** — understands your goals, background, and preferences
- **Research-backed curriculum** — studies real syllabi before building your learning path
- **Spaced repetition (FSRS-5)** — scientifically optimized review scheduling
- **Domain adapters** — coding, or any subject via the general adapter
- **Zero friction** — SessionStart hook picks up where you left off
- **Your files, your progress** — everything is readable markdown and editable

## Commands

| Command | What It Does |
|---------|-------------|
| `/synapse:init` | Set up a new learning project |
| `/synapse:review` | Quick spaced repetition drill |
| `/synapse:progress` | See your stats and progress |
| `/synapse:update` | Check for and apply updates |
| `/synapse:help` | List all commands |

## Requirements

- Claude Code
- Python 3.8+ or Node.js 16+ (for FSRS scheduling)

## License

MIT
