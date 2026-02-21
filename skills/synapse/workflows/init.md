# /synapse:init — Full Onboarding

Set up a new learning project. 5-phase conversational onboarding (~10-15 min).

## Prerequisites
- None. Works in any directory.
- If directory already has Synapse files (`.learning/state.json` exists):
  - Warn: "This directory already has a learning project. Start fresh or modify?"
  - "Start fresh" → archive old files to `.learning/archive/<date>/`, proceed
  - "Modify" → open profile.md and curriculum.md for editing, then regenerate state

## Flow

### Phase 1: Dream Extraction

**Purpose**: Understand what the learner wants to be able to DO.

Ask conversationally (adapt, don't read verbatim):
1. "What do you want to learn?"
2. "What's your goal — when you're done, what do you want to be able to *do*?"
3. "What's driving this?" (context: career, hobby, trip, school, project, curiosity)
4. "Do you have a timeline in mind?"

**Adaptive behavior**:
- If the learner volunteers info that answers multiple questions, skip ahead
- If goal is vague, probe for specificity: "What do you want to build/do with [topic]?"
- No timeline is fine — note "open-ended" and move on

**Extract**: topic, outcome, context, timeline

**Domain detection**: From the topic, identify adapter (coding, general). If ambiguous, ask.

### Phase 2: Background Assessment

**Purpose**: Understand their starting point without a formal test.

Ask conversationally:
5. "What do you already know about [topic]?"
6. "Any related experience that might help?"
7. "Have you tried learning this before? What happened?"

**Adaptive behavior**:
- "Complete beginner, never touched it" → skip Q6-Q7
- Past failure → dig into WHY: "Too boring, too hard, too theoretical, no time?"
- Strong adjacent knowledge → note for curriculum leverage

**Extract**: existing_knowledge, related_skills, prior_attempts, estimated_level

### Phase 3: Learning Preferences

**Purpose**: Configure the experience.

Ask:
8. "How do you prefer to learn?" Explain options briefly:
   - **Socratic** — I ask guiding questions so you discover answers yourself
   - **Drill-based** — lots of practice, learn by repetition
   - **Project-based** — build something real, learn concepts as needed
   - **Theory-first** — understand the why before the how
   - **Discovery** — explore and experiment, I guide when stuck
   - **Mixed** — I pick the best method for each concept
9. "How long do you want each session?" (5-10 min quick, 15-20 standard, 30+ deep)
10. "How often will you practice?"

**Adaptive behavior**:
- If Phase 2 revealed preference ("Udemy was too theoretical"), reference it
- "I don't know, you pick" → default to Mixed, explain you'll adapt
- Unusual method for domain → gently flag but respect choice

**Extract**: method, session_length, frequency

### Phase 4: Curriculum Generation

**Purpose**: Build the roadmap from the goal backward.

1. Summarize what you understood: "Let me make sure I've got this right — [summary]"
2. Learner confirms or corrects
3. **Spawn Didactic Researcher** subagent:
   - Task: research how this subject is actually taught
   - Agent reads: topic, goal, background level, domain adapter
   - Agent writes: `.learning/research.md`
   - Wait for completion
4. **Spawn Curriculum Generator** subagent:
   - Task: build curriculum + concept DAG from research
   - Agent reads: `.learning/research.md`, learner profile data
   - Agent writes: `curriculum.md`, updates `.learning/state.json` with concepts
   - Wait for completion
5. Present the roadmap to the learner:
   ```
   Here's your learning path:

   Module 1: [name] — [description] (~X sessions)
     Milestone: [what you'll be able to do]

   Module 2: [name] — [description] (~X sessions)
     Milestone: [what you'll be able to do]

   ...

   Estimated: ~Y sessions over Z weeks at [frequency].
   ```
6. Learner adjusts:
   - "Too slow" → compress modules
   - "I know module X" → mark optional, verify during sessions
   - "Add more about Y" → expand
   - "Looks good" → proceed

### Phase 5: Environment Setup

**Purpose**: Create all files and give the learner their classroom.

1. Detect runtime: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup/detect-runtime.sh`
2. Create `profile.md` from Phase 1-3 data (use template from `${CLAUDE_PLUGIN_ROOT}/templates/profile.md`)
3. Create `CLAUDE.md` from template (`${CLAUDE_PLUGIN_ROOT}/templates/claude-md.md`) with learner data filled in
4. Create `progress.md` (empty, will be populated after first session)
5. Create `.learning/session-history.json` (empty array: `[]`)
6. Create `.learning/review-queue.json` (empty: `{"due":[],"upcoming":[],"stats":{"total_active_cards":0,"due_today":0,"due_this_week":0,"average_retrievability":0}}`)
7. Create `exercises/` directories matching curriculum modules (e.g., `exercises/01-[module-name]/`)
8. Show welcome message:
   ```
   You're all set! Here's your learning environment:

   Goal: [outcome]
   Path: [X] modules, ~[Y] sessions, ~[Z] weeks
   Style: [method], [session_length] sessions, [frequency]
   First up: [Module 1 name] — [Module 1 description]

   Your curriculum is in curriculum.md (feel free to edit it).
   Your progress will be tracked in progress.md after each session.

   Ready to start your first session?
   ```
9. Wait for response:
   - "Yes" / "Let's go" → transition to first session (session loop takes over)
   - "Not now" → "No problem. Just open Claude in this directory anytime — it'll pick up right where we left off."

## Edge Cases
- **Minimal answers**: work with what's given, make reasonable assumptions, state them
- **Changed mind**: restart from Phase 1 with new topic
- **Returning learner**: detect existing files, offer start fresh or modify

## Tone
Conversational, warm, curious. One question at a time. Each answer gets full attention. This is a conversation, not a form.
