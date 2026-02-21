# Changelog

## 0.1.0 (2026-02-21)

Initial MVP release.

### Added
- `/synapse:init` — full conversational onboarding (5 phases)
- `/synapse:review` — FSRS-driven spaced repetition drill
- `/synapse:progress` — stats and progress display
- `/synapse:update` — version check and update
- `/synapse:help` — command listing
- Session loop with auto-resume via SessionStart hook
- FSRS-5 spaced repetition engine (vendored, Python + Node)
- Domain adapters: `coding`, `general`
- Didactic researcher and curriculum generator subagents
- SessionStart and Stop hooks for session continuity
- Templates for learner project files
