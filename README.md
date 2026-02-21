# Synapse

Turn any directory into a structured learning environment.

Synapse is a Claude Code plugin that builds personalized curricula,
teaches you session by session with spaced repetition (FSRS-5),
adapts to your mistakes, and picks up exactly where you left off.

## What It Does

- **Conversational onboarding** — understands your goals, background, and preferences
- **Research-backed curriculum** — studies real syllabi before building your learning path
- **Spaced repetition (FSRS-5)** — scientifically optimized review scheduling
- **Domain adapters** — coding, or any subject via the general adapter
- **Zero friction** — SessionStart hook picks up where you left off
- **Your files, your progress** — everything is readable markdown and editable

## Requirements

- **Claude Code** — Anthropic's CLI for Claude ([install guide below](#new-to-claude-code))
- **Node.js 16+** or **Python 3.8+** — needed for the FSRS spaced-repetition scheduler. You only need one. No packages to install — everything is vendored.

> Most machines already have one of these. Run `node -v` or `python3 --version` to check.

## Install

```
/plugin marketplace add EnescuDavid/Synapse
```
```
/plugin install synapse@synapse
```

## Quick Start

```
mkdir ~/learning/python && cd ~/learning/python
/synapse:init
```

Synapse will walk you through an onboarding conversation, research your topic, and build a personalized curriculum. Every time you open the project in Claude Code, it picks up where you left off.

## Commands

| Command | What It Does |
|---------|-------------|
| `/synapse:init` | Set up a new learning project |
| `/synapse:review` | Quick spaced repetition drill |
| `/synapse:progress` | See your stats and progress |
| `/synapse:update` | Check for and apply updates |
| `/synapse:help` | List all commands |

---

## New to Claude Code?

Claude Code is Anthropic's official command-line tool for working with Claude. Synapse runs as a plugin inside it. Here's how to get set up from scratch:

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

> Requires Node.js 18+. If you don't have Node.js, grab it from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`.

### 2. Authenticate

```bash
claude
```

On first launch, Claude Code will walk you through signing in with your Anthropic account. You need an active Claude Pro, Team, or Enterprise subscription (or API credits).

### 3. Install Synapse

Once Claude Code is running:

```
/plugin marketplace add EnescuDavid/Synapse
```
```
/plugin install synapse@synapse
```

### 4. Start learning

```bash
mkdir ~/learning/python && cd ~/learning/python
claude
```

Then inside the session:

```
/synapse:init
```

That's it. Synapse takes over from here — it'll ask about your goals, research the topic, and build your curriculum.

## License

MIT
