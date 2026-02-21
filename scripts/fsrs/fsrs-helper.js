#!/usr/bin/env node
/**
 * FSRS Helper — CLI wrapper for Synapse's spaced repetition engine.
 * Called by Claude during sessions to compute review scheduling.
 *
 * Usage:
 *   node fsrs-helper.js review --card '{"state":0,...}' --rating 3
 *   node fsrs-helper.js queue --state .learning/state.json
 *   node fsrs-helper.js preview --card '{"state":2,...}'
 */

const fs = require("fs");
const path = require("path");
const { FSRS, Rating, State } = require(path.join(__dirname, "fsrs-core.js"));

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = val;
      if (val !== true) i++;
    } else {
      args._.push(argv[i]);
    }
  }
  return args;
}

function cmdReview(args) {
  const card = JSON.parse(args.card);
  const rating = parseInt(args.rating, 10);
  const reviewDate = args.date || null;

  let fsrsParams = {};
  if (args.params) {
    fsrsParams = JSON.parse(args.params);
  }

  const fsrs = new FSRS({
    w: fsrsParams.w,
    desired_retention: fsrsParams.request_retention || 0.9,
    maximum_interval: fsrsParams.maximum_interval || 365,
  });

  const { card: newCard, log } = fsrs.review(card, rating, reviewDate);

  const result = {
    card: {
      state: newCard.state,
      stability: Math.round(newCard.stability * 10000) / 10000,
      difficulty: Math.round(newCard.difficulty * 10000) / 10000,
      due: newCard.due,
      last_review: newCard.last_review,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      reps: newCard.reps,
      lapses: newCard.lapses,
    },
    log,
    next_due: newCard.due,
  };

  console.log(JSON.stringify(result, null, 2));
}

function cmdQueue(args) {
  const stateFile = fs.readFileSync(args.state, "utf8");
  const state = JSON.parse(stateFile);

  const concepts = state.concepts || {};
  const fsrsParams = (state.fsrs && state.fsrs.parameters) || {};

  // Extract FSRS card data from concepts
  const cards = {};
  for (const [conceptId, concept] of Object.entries(concepts)) {
    if (concept.fsrs_card) {
      cards[conceptId] = concept.fsrs_card;
    }
  }

  const fsrs = new FSRS({
    w: fsrsParams.w,
    desired_retention: fsrsParams.request_retention || 0.9,
  });

  const queue = fsrs.getQueue(cards, args.date || null);
  console.log(JSON.stringify(queue, null, 2));
}

function cmdPreview(args) {
  const card = JSON.parse(args.card);
  const reviewDate = args.date || null;

  let fsrsParams = {};
  if (args.params) {
    fsrsParams = JSON.parse(args.params);
  }

  const fsrs = new FSRS({
    w: fsrsParams.w,
    desired_retention: fsrsParams.request_retention || 0.9,
  });

  const result = fsrs.preview(card, reviewDate);
  console.log(JSON.stringify(result, null, 2));
}

// Main
const args = parseArgs(process.argv);
const command = args._[0];

if (!command) {
  console.error("Usage: fsrs-helper.js <review|queue|preview> [options]");
  process.exit(1);
}

try {
  switch (command) {
    case "review":
      cmdReview(args);
      break;
    case "queue":
      cmdQueue(args);
      break;
    case "preview":
      cmdPreview(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}
