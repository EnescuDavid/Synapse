#!/usr/bin/env node
/**
 * Session Close — Deterministic state updater for Synapse.
 * Called once at session end with session results as JSON.
 * Handles ALL file updates in one shot:
 *   1. Update .learning/state.json (FSRS cards, streak, sessions_completed, unlocks)
 *   2. Append to progress.md
 *   3. Regenerate .learning/review-queue.json
 *   4. Append to .learning/session-history.json
 *   5. Delete .learning/session-handoff.json
 *
 * Usage:
 *   node session-close.js --results '<json>'
 *   node session-close.js --results-file /path/to/results.json
 *
 * Input JSON schema:
 * {
 *   "date": "2026-02-22",              // ISO date
 *   "duration_min": 30,                 // approx session length
 *   "concepts": [                       // concepts covered this session
 *     {
 *       "id": "piece-values",
 *       "is_new": true,                 // first time or review
 *       "grades": [3, 4, 3],           // FSRS grades assigned (1-4)
 *       "bloom_level": "understand",    // current Bloom's level after session
 *       "misconceptions": ["..."],      // new misconceptions found (optional)
 *       "note": "brief session note"    // for progress.md (optional)
 *     }
 *   ],
 *   "observations": "...",              // overall session observations for progress.md
 *   "unlocked": ["concept-id", ...]     // concepts to unlock (set status: available)
 * }
 */

const fs = require("fs");
const path = require("path");

// Load FSRS engine
const fsrsCorePath = path.join(__dirname, "..", "fsrs", "fsrs-core.js");
const { FSRS, Rating, State, createCard } = require(fsrsCorePath);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = val;
      if (val !== true) i++;
    }
  }
  return args;
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function main() {
  const args = parseArgs(process.argv);

  // Parse input
  let results;
  if (args["results-file"]) {
    results = loadJSON(args["results-file"]);
  } else if (args.results) {
    results = JSON.parse(args.results);
  } else {
    console.error("Usage: session-close.js --results '<json>' or --results-file <path>");
    process.exit(1);
  }

  const stateFile = ".learning/state.json";
  const progressFile = "progress.md";
  const historyFile = ".learning/session-history.json";
  const queueFile = ".learning/review-queue.json";
  const handoffFile = ".learning/session-handoff.json";

  // --- 1. Load and update state.json ---
  const state = loadJSON(stateFile);
  const fsrsParams = (state.fsrs && state.fsrs.parameters) || {};
  const fsrs = new FSRS({
    w: fsrsParams.w,
    desired_retention: fsrsParams.request_retention || 0.9,
    maximum_interval: fsrsParams.maximum_interval || 365,
  });

  const today = results.date || new Date().toISOString().split("T")[0];
  const reviewDate = today + "T12:00:00.000Z";

  // Process each concept's grades through FSRS
  const conceptResults = [];
  for (const concept of results.concepts) {
    // Find concept in state (supports both array and object formats)
    let stateConcept;
    if (Array.isArray(state.concepts)) {
      stateConcept = state.concepts.find((c) => c.id === concept.id);
    } else {
      stateConcept = state.concepts[concept.id];
    }

    if (!stateConcept) {
      console.error(`Warning: concept "${concept.id}" not found in state.json, skipping`);
      continue;
    }

    // Get or create FSRS card
    let card = stateConcept.fsrs || stateConcept.fsrs_card || createCard();

    // Process each grade through FSRS sequentially
    for (const grade of concept.grades) {
      const result = fsrs.review(card, grade, reviewDate);
      card = result.card;
    }

    // Update concept in state
    stateConcept.fsrs = card;
    stateConcept.fsrs_card = card; // support both field names
    stateConcept.status = "learning";
    if (concept.bloom_level) {
      stateConcept.bloom_level = concept.bloom_level;
    }
    if (concept.misconceptions && concept.misconceptions.length > 0) {
      stateConcept.misconceptions = stateConcept.misconceptions || [];
      stateConcept.misconceptions.push(...concept.misconceptions);
    }

    conceptResults.push({
      id: concept.id,
      is_new: concept.is_new,
      grades: concept.grades,
      final_card: card,
      note: concept.note || "",
    });
  }

  // Unlock concepts
  if (results.unlocked) {
    for (const unlockId of results.unlocked) {
      let c;
      if (Array.isArray(state.concepts)) {
        c = state.concepts.find((x) => x.id === unlockId);
      } else {
        c = state.concepts[unlockId];
      }
      if (c && c.status === "locked") {
        c.status = "available";
      }
    }
  }

  // Update streak
  if (!state.streak) state.streak = { current: 0, longest: 0, last_session_date: null };
  const lastDate = state.streak.last_session_date;
  if (lastDate) {
    const daysSince = Math.floor(
      (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 1) {
      state.streak.current = (state.streak.current || 0) + 1;
    } else {
      state.streak.current = 1;
    }
  } else {
    state.streak.current = 1;
  }
  state.streak.longest = Math.max(state.streak.longest || 0, state.streak.current);
  state.streak.last_session_date = today;

  // Increment sessions
  state.sessions_completed = (state.sessions_completed || 0) + 1;

  writeJSON(stateFile, state);

  // --- 2. Append to progress.md ---
  const sessionNum = state.sessions_completed;
  const totalExercises = results.concepts.reduce((sum, c) => sum + c.grades.length, 0);
  const totalCorrect = results.concepts.reduce(
    (sum, c) => sum + c.grades.filter((g) => g >= 3).length,
    0
  );
  const successRate = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;

  // Find current module from first concept
  let moduleName = "";
  if (results.concepts.length > 0) {
    const firstConcept = Array.isArray(state.concepts)
      ? state.concepts.find((c) => c.id === results.concepts[0].id)
      : state.concepts[results.concepts[0].id];
    if (firstConcept && firstConcept.module) {
      moduleName = `Module ${firstConcept.module}`;
    }
  }

  let progressEntry = `\n## Session ${sessionNum} — ${today}\n`;
  progressEntry += `**${moduleName}** | **Duration**: ~${results.duration_min} min | **Exercises**: ${totalExercises} | **Success rate**: ${successRate}%\n\n`;

  // Concept details
  const gradeLabel = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
  for (const cr of conceptResults) {
    const avgGrade = cr.grades.reduce((a, b) => a + b, 0) / cr.grades.length;
    const label = gradeLabel[Math.round(avgGrade)] || "Good";
    const tag = cr.is_new ? "(new)" : "(review)";
    progressEntry += `- **${cr.id}** ${tag} — ${label}`;
    if (cr.note) progressEntry += `. ${cr.note}`;
    progressEntry += "\n";
  }

  if (results.observations) {
    progressEntry += `\n${results.observations}\n`;
  }

  if (results.unlocked && results.unlocked.length > 0) {
    progressEntry += `\n**Unlocked**: ${results.unlocked.join(", ")}\n`;
  }

  fs.appendFileSync(progressFile, progressEntry);

  // --- 3. Regenerate review queue ---
  const cards = {};
  const conceptList = Array.isArray(state.concepts)
    ? state.concepts
    : Object.entries(state.concepts).map(([id, c]) => ({ id, ...c }));

  for (const c of conceptList) {
    const card = c.fsrs || c.fsrs_card;
    if (card && card.state !== 0) {
      cards[c.id] = card;
    }
  }
  const queue = fsrs.getQueue(cards, today);
  writeJSON(queueFile, queue);

  // --- 4. Append to session history ---
  let history = [];
  try {
    history = loadJSON(historyFile);
  } catch {
    // file doesn't exist or is empty
  }

  history.push({
    session: sessionNum,
    date: today,
    duration_min: results.duration_min,
    exercises: totalExercises,
    success_rate: successRate / 100,
    concepts_new: results.concepts.filter((c) => c.is_new).map((c) => c.id),
    concepts_reviewed: results.concepts.filter((c) => !c.is_new).map((c) => c.id),
    grades: Object.fromEntries(results.concepts.map((c) => [c.id, c.grades])),
    misconceptions_flagged: results.concepts
      .filter((c) => c.misconceptions && c.misconceptions.length > 0)
      .flatMap((c) => c.misconceptions),
    notes: results.observations || "",
  });

  writeJSON(historyFile, history);

  // --- 5. Clean up handoff ---
  try {
    fs.unlinkSync(handoffFile);
  } catch {
    // doesn't exist, that's fine
  }

  // --- Output summary ---
  const summary = {
    session: sessionNum,
    exercises: totalExercises,
    success_rate: `${successRate}%`,
    streak: state.streak.current,
    concepts_updated: conceptResults.length,
    concepts_unlocked: (results.unlocked || []).length,
    next_reviews: queue.due.length > 0
      ? `${queue.due.length} due now`
      : queue.upcoming.length > 0
        ? `${queue.upcoming.length} due this week`
        : "none upcoming",
  };

  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (err) {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}
