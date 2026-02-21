"""
FSRS-5 Core Algorithm — Vendored Implementation
Based on open-spaced-repetition/fsrs-5 (MIT License)
Zero external dependencies. Pure Python math.

The DSR model tracks three memory variables:
  - Difficulty (D): 1.0 - 10.0, how hard the concept is for this learner
  - Stability (S): days until retrievability drops to 90%
  - Retrievability (R): current probability of successful recall (0.0 - 1.0)
"""

import math
from datetime import datetime, timedelta, timezone
from enum import IntEnum
from typing import Optional

# FSRS-5 default parameters (19 weights)
# Trained on hundreds of millions of reviews from ~10,000 users
DEFAULT_W = [
    0.40255, 1.18385, 3.173, 15.69105,  # w0-w3: initial stability per grade
    7.1949,                                # w4: initial difficulty baseline
    0.5345,                                # w5: initial difficulty grade scaling
    1.4604,                                # w6: difficulty delta scaling
    0.0046,                                # w7: difficulty mean reversion rate
    1.54575,                               # w8: stability increase base factor
    0.1192,                                # w9: stability increase — old stability penalty
    1.01925,                               # w10: stability increase — retrievability bonus
    1.9395,                                # w11: post-lapse stability base
    0.11,                                  # w12: post-lapse difficulty factor
    0.29605,                               # w13: post-lapse stability factor
    2.2698,                                # w14: post-lapse retrievability factor
    0.2315,                                # w15: hard grade penalty
    2.9898,                                # w16: easy grade bonus
    0.51655,                               # w17: short-term stability (unused in FSRS-5)
    0.6621,                                # w18: short-term stability (unused in FSRS-5)
]

# Power forgetting curve constants
FACTOR = 19.0 / 81.0  # ~0.2346
DECAY = -0.5


class Rating(IntEnum):
    Again = 1
    Hard = 2
    Good = 3
    Easy = 4


class State(IntEnum):
    New = 0
    Learning = 1
    Review = 2
    Relearning = 3


class Card:
    """FSRS card state for a single concept."""

    def __init__(self):
        self.state: int = State.New
        self.stability: float = 0.0
        self.difficulty: float = 0.0
        self.due: Optional[str] = None
        self.last_review: Optional[str] = None
        self.elapsed_days: int = 0
        self.scheduled_days: int = 0
        self.reps: int = 0
        self.lapses: int = 0

    def to_dict(self):
        return {
            "state": self.state,
            "stability": round(self.stability, 4),
            "difficulty": round(self.difficulty, 4),
            "due": self.due,
            "last_review": self.last_review,
            "elapsed_days": self.elapsed_days,
            "scheduled_days": self.scheduled_days,
            "reps": self.reps,
            "lapses": self.lapses,
        }

    @classmethod
    def from_dict(cls, d):
        card = cls()
        card.state = d.get("state", State.New)
        card.stability = d.get("stability", 0.0)
        card.difficulty = d.get("difficulty", 0.0)
        card.due = d.get("due")
        card.last_review = d.get("last_review")
        card.elapsed_days = d.get("elapsed_days", 0)
        card.scheduled_days = d.get("scheduled_days", 0)
        card.reps = d.get("reps", 0)
        card.lapses = d.get("lapses", 0)
        return card


class ReviewLog:
    """Record of a single review event."""

    def __init__(self, rating, state_before, state_after, elapsed_days, scheduled_days, review_date):
        self.rating = rating
        self.state_before = state_before
        self.state_after = state_after
        self.elapsed_days = elapsed_days
        self.scheduled_days = scheduled_days
        self.review_date = review_date

    def to_dict(self):
        return {
            "rating": self.rating,
            "state_before": self.state_before,
            "state_after": self.state_after,
            "elapsed_days": self.elapsed_days,
            "scheduled_days": self.scheduled_days,
            "review_date": self.review_date,
        }


class FSRS:
    """FSRS-5 scheduler."""

    def __init__(self, w=None, desired_retention=0.9, maximum_interval=365, enable_fuzz=True):
        self.w = w or list(DEFAULT_W)
        self.desired_retention = desired_retention
        self.maximum_interval = maximum_interval
        self.enable_fuzz = enable_fuzz

    # --- Core formulas ---

    def retrievability(self, elapsed_days, stability):
        """Power forgetting curve: R(t, S) = (1 + FACTOR * t/S)^DECAY"""
        if stability <= 0:
            return 0.0
        return (1.0 + FACTOR * elapsed_days / stability) ** DECAY

    def interval(self, stability):
        """Compute interval in days for desired retention."""
        i = (stability / FACTOR) * (self.desired_retention ** (1.0 / DECAY) - 1.0)
        return min(max(round(i), 1), self.maximum_interval)

    def initial_stability(self, rating):
        """S_0(G) = w[G-1]"""
        return self.w[rating - 1]

    def initial_difficulty(self, rating):
        """D_0(G) = clamp(w[4] - exp(w[5] * (G - 1)) + 1, 1, 10)"""
        d = self.w[4] - math.exp(self.w[5] * (rating - 1)) + 1.0
        return self._clamp_d(d)

    def next_stability_success(self, d, s, r, rating):
        """Stability after successful recall (rating >= 2)."""
        t_d = 11.0 - d
        t_s = s ** (-self.w[9])
        t_r = math.exp(self.w[10] * (1.0 - r)) - 1.0
        hard_mult = self.w[15] if rating == Rating.Hard else 1.0
        easy_mult = self.w[16] if rating == Rating.Easy else 1.0
        base = math.exp(self.w[8])
        alpha = 1.0 + t_d * t_s * t_r * hard_mult * easy_mult * base
        return s * alpha

    def next_stability_fail(self, d, s, r):
        """Stability after lapse (rating = 1 / Again)."""
        d_f = d ** (-self.w[12])
        s_f = (s + 1.0) ** self.w[13] - 1.0
        r_f = math.exp(self.w[14] * (1.0 - r))
        new_s = self.w[11] * d_f * s_f * r_f
        return min(new_s, s)

    def next_difficulty(self, d, rating):
        """Difficulty update with mean reversion toward D_0(Easy)."""
        delta = -self.w[6] * (rating - 3.0)
        d_prime = d + delta * ((10.0 - d) / 9.0)
        d_new = self.w[7] * self.initial_difficulty(Rating.Easy) + (1.0 - self.w[7]) * d_prime
        return self._clamp_d(d_new)

    def _clamp_d(self, d):
        return max(1.0, min(10.0, d))

    # --- Main API ---

    def review(self, card, rating, review_date=None):
        """Process a review and return (updated_card, review_log)."""
        if review_date is None:
            review_date = datetime.now(timezone.utc).isoformat()

        state_before = card.state
        new_card = Card.from_dict(card.to_dict())

        if card.state == State.New:
            # First review — initialize
            new_card.stability = self.initial_stability(rating)
            new_card.difficulty = self.initial_difficulty(rating)
            new_card.reps = 1
            new_card.elapsed_days = 0

            if rating == Rating.Again:
                new_card.state = State.Learning
                new_card.scheduled_days = 0
                new_card.due = review_date  # review again same session
            elif rating == Rating.Hard:
                new_card.state = State.Learning
                new_card.scheduled_days = 0
                new_card.due = review_date
            else:
                # Good or Easy — go straight to Review
                new_card.state = State.Review
                interval = self.interval(new_card.stability)
                new_card.scheduled_days = interval
                new_card.due = self._add_days(review_date, interval)

        elif card.state == State.Learning or card.state == State.Relearning:
            # In learning/relearning steps
            elapsed = self._days_between(card.last_review, review_date) if card.last_review else 0
            new_card.elapsed_days = elapsed
            r = self.retrievability(elapsed, card.stability) if card.stability > 0 else 0.0

            new_card.difficulty = self.next_difficulty(card.difficulty, rating)

            if rating == Rating.Again:
                new_card.stability = self.initial_stability(rating)
                new_card.state = State.Learning if card.state == State.Learning else State.Relearning
                new_card.scheduled_days = 0
                new_card.due = review_date
                if card.state == State.Learning:
                    new_card.lapses = card.lapses
                else:
                    new_card.lapses = card.lapses
            else:
                new_card.stability = self.next_stability_success(
                    card.difficulty, card.stability, r, rating
                ) if card.stability > 0 else self.initial_stability(rating)
                new_card.state = State.Review
                interval = self.interval(new_card.stability)
                new_card.scheduled_days = interval
                new_card.due = self._add_days(review_date, interval)

            new_card.reps = card.reps + 1

        elif card.state == State.Review:
            # Existing review card
            elapsed = self._days_between(card.last_review, review_date) if card.last_review else 0
            new_card.elapsed_days = elapsed
            r = self.retrievability(elapsed, card.stability)

            new_card.difficulty = self.next_difficulty(card.difficulty, rating)

            if rating == Rating.Again:
                # Lapse
                new_card.stability = self.next_stability_fail(card.difficulty, card.stability, r)
                new_card.state = State.Relearning
                new_card.lapses = card.lapses + 1
                new_card.scheduled_days = 0
                new_card.due = review_date
            else:
                new_card.stability = self.next_stability_success(
                    card.difficulty, card.stability, r, rating
                )
                new_card.state = State.Review
                interval = self.interval(new_card.stability)
                new_card.scheduled_days = interval
                new_card.due = self._add_days(review_date, interval)

            new_card.reps = card.reps + 1

        new_card.last_review = review_date

        log = ReviewLog(
            rating=rating,
            state_before=state_before,
            state_after=new_card.state,
            elapsed_days=new_card.elapsed_days,
            scheduled_days=new_card.scheduled_days,
            review_date=review_date,
        )

        return new_card, log

    def preview(self, card, review_date=None):
        """Preview all 4 rating outcomes for a card."""
        results = {}
        for rating in [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]:
            new_card, _ = self.review(card, rating, review_date)
            results[rating.name.lower()] = {
                "interval": new_card.scheduled_days,
                "next_due": new_card.due,
                "stability": round(new_card.stability, 2),
            }
        return results

    def get_queue(self, cards, today=None):
        """Build review queue from a dict of {concept_id: card_dict}.
        Returns {due: [...], upcoming: [...]}."""
        if today is None:
            today = datetime.now(timezone.utc).date()
        elif isinstance(today, str):
            today = datetime.fromisoformat(today.replace("Z", "+00:00")).date()

        due = []
        upcoming = []
        total_active = 0
        total_retrievability = 0.0
        active_count = 0

        for concept_id, card_data in cards.items():
            card = Card.from_dict(card_data) if isinstance(card_data, dict) else card_data

            if card.state == State.New:
                continue

            total_active += 1

            if not card.due or not card.last_review:
                continue

            due_date = datetime.fromisoformat(card.due.replace("Z", "+00:00")).date()
            last_review = datetime.fromisoformat(card.last_review.replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - last_review).days
            r = self.retrievability(elapsed, card.stability) if card.stability > 0 else 0.0
            total_retrievability += r
            active_count += 1

            if due_date <= today:
                overdue_days = (today - due_date).days
                due.append({
                    "concept_id": concept_id,
                    "due_date": due_date.isoformat(),
                    "overdue_days": overdue_days,
                    "stability": round(card.stability, 2),
                    "difficulty": round(card.difficulty, 2),
                    "retrievability": round(r, 4),
                    "state": card.state,
                })
            elif due_date <= today + timedelta(days=7):
                upcoming.append({
                    "concept_id": concept_id,
                    "due_date": due_date.isoformat(),
                    "stability": round(card.stability, 2),
                })

        # Sort: relearning first, then most overdue
        due.sort(key=lambda x: (-1 if x["state"] == State.Relearning else 0, -x["overdue_days"]))
        upcoming.sort(key=lambda x: x["due_date"])

        avg_r = round(total_retrievability / active_count, 4) if active_count > 0 else 0.0

        return {
            "due": due,
            "upcoming": upcoming,
            "stats": {
                "total_active_cards": total_active,
                "due_today": len(due),
                "due_this_week": len(due) + len(upcoming),
                "average_retrievability": avg_r,
            },
        }

    # --- Helpers ---

    def _add_days(self, iso_date, days):
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return (dt + timedelta(days=days)).isoformat()

    def _days_between(self, iso_start, iso_end):
        start = datetime.fromisoformat(iso_start.replace("Z", "+00:00"))
        end = datetime.fromisoformat(iso_end.replace("Z", "+00:00"))
        return max(0, (end - start).days)
