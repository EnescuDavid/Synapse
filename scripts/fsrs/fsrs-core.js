/**
 * FSRS-5 Core Algorithm — Vendored Implementation
 * Based on open-spaced-repetition/fsrs-5 (MIT License)
 * Zero external dependencies. Pure JavaScript math.
 *
 * The DSR model tracks three memory variables:
 *   - Difficulty (D): 1.0 - 10.0, how hard the concept is for this learner
 *   - Stability (S): days until retrievability drops to 90%
 *   - Retrievability (R): current probability of successful recall (0.0 - 1.0)
 */

// FSRS-5 default parameters (19 weights)
const DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105,  // w0-w3: initial stability per grade
  7.1949,                                // w4: initial difficulty baseline
  0.5345,                                // w5: initial difficulty grade scaling
  1.4604,                                // w6: difficulty delta scaling
  0.0046,                                // w7: difficulty mean reversion rate
  1.54575,                               // w8: stability increase base factor
  0.1192,                                // w9: stability increase — old stability penalty
  1.01925,                               // w10: stability increase — retrievability bonus
  1.9395,                                // w11: post-lapse stability base
  0.11,                                  // w12: post-lapse difficulty factor
  0.29605,                               // w13: post-lapse stability factor
  2.2698,                                // w14: post-lapse retrievability factor
  0.2315,                                // w15: hard grade penalty
  2.9898,                                // w16: easy grade bonus
  0.51655,                               // w17: short-term stability (unused in FSRS-5)
  0.6621,                                // w18: short-term stability (unused in FSRS-5)
];

// Power forgetting curve constants
const FACTOR = 19.0 / 81.0; // ~0.2346
const DECAY = -0.5;

// Rating enum
const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };

// State enum
const State = { New: 0, Learning: 1, Review: 2, Relearning: 3 };

function createCard() {
  return {
    state: State.New,
    stability: 0,
    difficulty: 0,
    due: null,
    last_review: null,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
  };
}

function cloneCard(card) {
  return { ...card };
}

function clampD(d) {
  return Math.max(1.0, Math.min(10.0, d));
}

function addDays(isoDate, days) {
  const dt = new Date(isoDate);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString();
}

function daysBetween(isoStart, isoEnd) {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

function todayISO() {
  return new Date().toISOString();
}

function todayDate() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

class FSRS {
  constructor(options = {}) {
    this.w = options.w || [...DEFAULT_W];
    this.desiredRetention = options.desired_retention || 0.9;
    this.maximumInterval = options.maximum_interval || 365;
    this.enableFuzz = options.enable_fuzz !== undefined ? options.enable_fuzz : true;
  }

  // --- Core formulas ---

  retrievability(elapsedDays, stability) {
    if (stability <= 0) return 0;
    return Math.pow(1.0 + FACTOR * elapsedDays / stability, DECAY);
  }

  interval(stability) {
    const i = (stability / FACTOR) * (Math.pow(this.desiredRetention, 1.0 / DECAY) - 1.0);
    return Math.min(Math.max(Math.round(i), 1), this.maximumInterval);
  }

  initialStability(rating) {
    return this.w[rating - 1];
  }

  initialDifficulty(rating) {
    const d = this.w[4] - Math.exp(this.w[5] * (rating - 1)) + 1.0;
    return clampD(d);
  }

  nextStabilitySuccess(d, s, r, rating) {
    const tD = 11.0 - d;
    const tS = Math.pow(s, -this.w[9]);
    const tR = Math.exp(this.w[10] * (1.0 - r)) - 1.0;
    const hardMult = rating === Rating.Hard ? this.w[15] : 1.0;
    const easyMult = rating === Rating.Easy ? this.w[16] : 1.0;
    const base = Math.exp(this.w[8]);
    const alpha = 1.0 + tD * tS * tR * hardMult * easyMult * base;
    return s * alpha;
  }

  nextStabilityFail(d, s, r) {
    const dF = Math.pow(d, -this.w[12]);
    const sF = Math.pow(s + 1.0, this.w[13]) - 1.0;
    const rF = Math.exp(this.w[14] * (1.0 - r));
    const newS = this.w[11] * dF * sF * rF;
    return Math.min(newS, s);
  }

  nextDifficulty(d, rating) {
    const delta = -this.w[6] * (rating - 3.0);
    const dPrime = d + delta * ((10.0 - d) / 9.0);
    const dNew = this.w[7] * this.initialDifficulty(Rating.Easy) + (1.0 - this.w[7]) * dPrime;
    return clampD(dNew);
  }

  // --- Main API ---

  review(card, rating, reviewDate = null) {
    if (!reviewDate) reviewDate = todayISO();
    const stateBefore = card.state;
    const nc = cloneCard(card);

    if (card.state === State.New) {
      nc.stability = this.initialStability(rating);
      nc.difficulty = this.initialDifficulty(rating);
      nc.reps = 1;
      nc.elapsed_days = 0;

      if (rating <= Rating.Hard) {
        nc.state = State.Learning;
        nc.scheduled_days = 0;
        nc.due = reviewDate;
      } else {
        nc.state = State.Review;
        const ivl = this.interval(nc.stability);
        nc.scheduled_days = ivl;
        nc.due = addDays(reviewDate, ivl);
      }
    } else if (card.state === State.Learning || card.state === State.Relearning) {
      const elapsed = card.last_review ? daysBetween(card.last_review, reviewDate) : 0;
      nc.elapsed_days = elapsed;
      const r = card.stability > 0 ? this.retrievability(elapsed, card.stability) : 0;

      nc.difficulty = this.nextDifficulty(card.difficulty, rating);

      if (rating === Rating.Again) {
        nc.stability = this.initialStability(rating);
        nc.state = card.state;
        nc.scheduled_days = 0;
        nc.due = reviewDate;
      } else {
        nc.stability = card.stability > 0
          ? this.nextStabilitySuccess(card.difficulty, card.stability, r, rating)
          : this.initialStability(rating);
        nc.state = State.Review;
        const ivl = this.interval(nc.stability);
        nc.scheduled_days = ivl;
        nc.due = addDays(reviewDate, ivl);
      }
      nc.reps = card.reps + 1;
    } else if (card.state === State.Review) {
      const elapsed = card.last_review ? daysBetween(card.last_review, reviewDate) : 0;
      nc.elapsed_days = elapsed;
      const r = this.retrievability(elapsed, card.stability);

      nc.difficulty = this.nextDifficulty(card.difficulty, rating);

      if (rating === Rating.Again) {
        nc.stability = this.nextStabilityFail(card.difficulty, card.stability, r);
        nc.state = State.Relearning;
        nc.lapses = card.lapses + 1;
        nc.scheduled_days = 0;
        nc.due = reviewDate;
      } else {
        nc.stability = this.nextStabilitySuccess(card.difficulty, card.stability, r, rating);
        nc.state = State.Review;
        const ivl = this.interval(nc.stability);
        nc.scheduled_days = ivl;
        nc.due = addDays(reviewDate, ivl);
      }
      nc.reps = card.reps + 1;
    }

    nc.last_review = reviewDate;

    const log = {
      rating,
      state_before: stateBefore,
      state_after: nc.state,
      elapsed_days: nc.elapsed_days,
      scheduled_days: nc.scheduled_days,
      review_date: reviewDate,
    };

    return { card: nc, log };
  }

  preview(card, reviewDate = null) {
    const results = {};
    for (const [name, val] of Object.entries(Rating)) {
      const { card: nc } = this.review(card, val, reviewDate);
      results[name.toLowerCase()] = {
        interval: nc.scheduled_days,
        next_due: nc.due,
        stability: Math.round(nc.stability * 100) / 100,
      };
    }
    return results;
  }

  getQueue(cards, today = null) {
    if (!today) today = todayDate();
    const todayD = new Date(today + "T00:00:00Z");

    const due = [];
    const upcoming = [];
    let totalActive = 0;
    let totalR = 0;
    let activeCount = 0;

    for (const [conceptId, cardData] of Object.entries(cards)) {
      if (cardData.state === State.New) continue;
      totalActive++;

      if (!cardData.due || !cardData.last_review) continue;

      const dueDate = new Date(cardData.due);
      const lastReview = new Date(cardData.last_review);
      const elapsed = Math.max(0, Math.floor((Date.now() - lastReview) / (1000 * 60 * 60 * 24)));
      const r = cardData.stability > 0 ? this.retrievability(elapsed, cardData.stability) : 0;
      totalR += r;
      activeCount++;

      const dueDateStr = dueDate.toISOString().split("T")[0];
      const overdueDays = Math.floor((todayD - dueDate) / (1000 * 60 * 60 * 24));
      const sevenDaysOut = new Date(todayD);
      sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7);

      if (dueDate <= todayD) {
        due.push({
          concept_id: conceptId,
          due_date: dueDateStr,
          overdue_days: overdueDays,
          stability: Math.round(cardData.stability * 100) / 100,
          difficulty: Math.round(cardData.difficulty * 100) / 100,
          retrievability: Math.round(r * 10000) / 10000,
          state: cardData.state,
        });
      } else if (dueDate <= sevenDaysOut) {
        upcoming.push({
          concept_id: conceptId,
          due_date: dueDateStr,
          stability: Math.round(cardData.stability * 100) / 100,
        });
      }
    }

    // Sort: relearning first, then most overdue
    due.sort((a, b) => {
      const stateA = a.state === State.Relearning ? -1 : 0;
      const stateB = b.state === State.Relearning ? -1 : 0;
      if (stateA !== stateB) return stateA - stateB;
      return b.overdue_days - a.overdue_days;
    });
    upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return {
      due,
      upcoming,
      stats: {
        total_active_cards: totalActive,
        due_today: due.length,
        due_this_week: due.length + upcoming.length,
        average_retrievability: activeCount > 0 ? Math.round(totalR / activeCount * 10000) / 10000 : 0,
      },
    };
  }
}

// Export for both CommonJS and module usage
if (typeof module !== "undefined") {
  module.exports = { FSRS, Rating, State, createCard, DEFAULT_W, FACTOR, DECAY };
}
