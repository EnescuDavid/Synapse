#!/usr/bin/env python3
"""
FSRS Helper — CLI wrapper for Synapse's spaced repetition engine.
Called by Claude during sessions to compute review scheduling.

Usage:
  python3 fsrs-helper.py review --card '{"state":0,...}' --rating 3
  python3 fsrs-helper.py queue --state .learning/state.json
  python3 fsrs-helper.py preview --card '{"state":2,...}'
"""

import argparse
import json
import os
import sys

# Import from vendored core (same directory)
import importlib.util
_core_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fsrs-core.py")
_spec = importlib.util.spec_from_file_location("fsrs_core", _core_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
FSRS = _mod.FSRS
Card = _mod.Card
Rating = _mod.Rating
State = _mod.State


def cmd_review(args):
    """Process a review event. Returns updated card state + next due date."""
    card_data = json.loads(args.card)
    card = Card.from_dict(card_data)

    fsrs_params = {}
    if args.params:
        fsrs_params = json.loads(args.params)

    fsrs = FSRS(
        w=fsrs_params.get("w"),
        desired_retention=fsrs_params.get("request_retention", 0.9),
        maximum_interval=fsrs_params.get("maximum_interval", 365),
    )

    new_card, log = fsrs.review(card, args.rating, args.date)

    result = {
        "card": new_card.to_dict(),
        "log": log.to_dict(),
        "next_due": new_card.due,
    }
    print(json.dumps(result, indent=2))


def cmd_queue(args):
    """Get today's review queue from state.json."""
    with open(args.state, "r") as f:
        state = json.load(f)

    concepts = state.get("concepts", {})
    fsrs_params = state.get("fsrs", {}).get("parameters", {})

    # Extract FSRS card data from concepts
    cards = {}
    for concept_id, concept in concepts.items():
        fsrs_card = concept.get("fsrs_card")
        if fsrs_card:
            cards[concept_id] = fsrs_card

    fsrs = FSRS(
        w=fsrs_params.get("w"),
        desired_retention=fsrs_params.get("request_retention", 0.9),
    )

    queue = fsrs.get_queue(cards, args.date)
    print(json.dumps(queue, indent=2))


def cmd_preview(args):
    """Preview all 4 rating outcomes for a card."""
    card_data = json.loads(args.card)
    card = Card.from_dict(card_data)

    fsrs_params = {}
    if args.params:
        fsrs_params = json.loads(args.params)

    fsrs = FSRS(
        w=fsrs_params.get("w"),
        desired_retention=fsrs_params.get("request_retention", 0.9),
    )

    result = fsrs.preview(card, args.date)
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser(description="FSRS-5 helper for Synapse")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # review command
    p_review = subparsers.add_parser("review", help="Process a review event")
    p_review.add_argument("--card", required=True, help="Card state as JSON")
    p_review.add_argument("--rating", required=True, type=int, choices=[1, 2, 3, 4])
    p_review.add_argument("--date", default=None, help="Review date (ISO format)")
    p_review.add_argument("--params", default=None, help="FSRS parameters as JSON")

    # queue command
    p_queue = subparsers.add_parser("queue", help="Get today's review queue")
    p_queue.add_argument("--state", required=True, help="Path to state.json")
    p_queue.add_argument("--date", default=None, help="Today's date (ISO format)")

    # preview command
    p_preview = subparsers.add_parser("preview", help="Preview all rating outcomes")
    p_preview.add_argument("--card", required=True, help="Card state as JSON")
    p_preview.add_argument("--date", default=None, help="Review date (ISO format)")
    p_preview.add_argument("--params", default=None, help="FSRS parameters as JSON")

    args = parser.parse_args()

    if args.command == "review":
        cmd_review(args)
    elif args.command == "queue":
        cmd_queue(args)
    elif args.command == "preview":
        cmd_preview(args)


if __name__ == "__main__":
    main()
