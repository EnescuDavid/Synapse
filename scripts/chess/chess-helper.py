#!/usr/bin/env python3
"""
Chess Helper — CLI tool for Synapse's chess domain adapter.
Opens positions on Lichess, validates FEN, renders boards.

Usage:
  python3 chess-helper.py validate --fen "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  python3 chess-helper.py url --fen "<FEN>" [--color black]
  python3 chess-helper.py open --fen "<FEN>" [--color black]
  python3 chess-helper.py board --fen "<FEN>" [--color black]
  python3 chess-helper.py position --white "Ke1,Qd1" --black "Ke8" [--to-move white] [--castling KQkq]
"""

import argparse
import json
import platform
import subprocess
import sys

PIECE_CHARS = "pnbrqkPNBRQK"
FILES = "abcdefgh"

UNICODE_PIECES = {
    "K": "\u2654", "Q": "\u2655", "R": "\u2656", "B": "\u2657", "N": "\u2658", "P": "\u2659",
    "k": "\u265a", "q": "\u265b", "r": "\u265c", "b": "\u265d", "n": "\u265e", "p": "\u265f",
}


# --- FEN validation (structural only, v1) ---

def validate_fen(fen):
    fields = fen.strip().split()
    if len(fields) < 1 or len(fields) > 6:
        return {"valid": False, "error": f"FEN must have 1-6 fields, got {len(fields)}"}

    placement = fields[0]
    side_to_move = fields[1] if len(fields) > 1 else "w"
    castling = fields[2] if len(fields) > 2 else "-"
    en_passant = fields[3] if len(fields) > 3 else "-"
    halfmove = fields[4] if len(fields) > 4 else "0"
    fullmove = fields[5] if len(fields) > 5 else "1"

    ranks = placement.split("/")
    if len(ranks) != 8:
        return {"valid": False, "error": f"Expected 8 ranks, got {len(ranks)}"}

    white_pieces = 0
    black_pieces = 0

    for i, rank in enumerate(ranks):
        squares = 0
        for ch in rank:
            if "1" <= ch <= "8":
                squares += int(ch)
            elif ch in PIECE_CHARS:
                squares += 1
                if ch.isupper():
                    white_pieces += 1
                else:
                    black_pieces += 1
            else:
                return {"valid": False, "error": f"Invalid character '{ch}' in rank {i + 1}"}
        if squares != 8:
            return {"valid": False, "error": f"Rank {i + 1} has {squares} squares (expected 8)"}

    if side_to_move not in ("w", "b"):
        return {"valid": False, "error": f"Side to move must be 'w' or 'b', got '{side_to_move}'"}

    import re
    if castling != "-" and not re.match(r"^[KQkq]{1,4}$", castling):
        return {"valid": False, "error": f"Invalid castling rights: '{castling}'"}

    if en_passant != "-" and not re.match(r"^[a-h][36]$", en_passant):
        return {"valid": False, "error": f"Invalid en passant square: '{en_passant}'"}

    if not halfmove.isdigit() or int(halfmove) < 0:
        return {"valid": False, "error": f"Invalid halfmove clock: '{halfmove}'"}

    if not fullmove.isdigit() or int(fullmove) < 1:
        return {"valid": False, "error": f"Invalid fullmove number: '{fullmove}'"}

    full_fen = f"{placement} {side_to_move} {castling} {en_passant} {halfmove} {fullmove}"

    return {
        "valid": True,
        "fen": full_fen,
        "pieces": {"white": white_pieces, "black": black_pieces},
        "side_to_move": "white" if side_to_move == "w" else "black",
        "castling": castling,
        "en_passant": en_passant,
    }


# --- URL generation ---

def build_url(fen, color=None):
    url_fen = fen.replace(" ", "_")
    url = f"https://lichess.org/analysis/standard/{url_fen}"
    if color == "black":
        url += "?color=black"
    return url


# --- Board rendering ---

def render_board(fen, color=None):
    placement = fen.split()[0]
    ranks = placement.split("/")
    board = []

    for rank in ranks:
        row = []
        for ch in rank:
            if "1" <= ch <= "8":
                row.extend(["\u00b7"] * int(ch))
            else:
                row.append(UNICODE_PIECES.get(ch, ch))
        board.append(row)

    lines = []
    if color == "black":
        for r in range(7, -1, -1):
            rank_num = r + 1
            lines.append(f"  {rank_num}  {' '.join(reversed(board[7 - r]))}")
        lines.append("     h g f e d c b a")
    else:
        for r in range(8):
            rank_num = 8 - r
            lines.append(f"  {rank_num}  {' '.join(board[r])}")
        lines.append("     a b c d e f g h")

    return "\n".join(lines)


# --- Position from piece lists ---

def parse_piece_list(piece_list):
    pieces = []
    for entry in piece_list.split(","):
        trimmed = entry.strip()
        if not trimmed:
            continue

        if len(trimmed) != 3:
            raise ValueError(f"Invalid piece entry '{trimmed}': expected format like 'Ke1'")

        piece = trimmed[0]
        if piece.upper() not in "KQRBNP":
            raise ValueError(f"Invalid piece letter '{piece}' in '{trimmed}'")

        file_ch = trimmed[1]
        rank_ch = trimmed[2]
        if file_ch not in FILES or rank_ch < "1" or rank_ch > "8":
            raise ValueError(f"Invalid square '{file_ch}{rank_ch}' in '{trimmed}'")

        pieces.append({
            "piece": piece,
            "file": FILES.index(file_ch),
            "rank": int(rank_ch) - 1,
        })
    return pieces


def position_to_fen(white_pieces, black_pieces, to_move="white", castling=None):
    board = [[None] * 8 for _ in range(8)]
    occupied = set()

    def place(pieces, is_white):
        for p in pieces:
            board_rank = 7 - p["rank"]
            key = (p["file"], board_rank)
            if key in occupied:
                raise ValueError(f"Duplicate square: {FILES[p['file']]}{p['rank'] + 1}")
            occupied.add(key)
            board[board_rank][p["file"]] = p["piece"].upper() if is_white else p["piece"].lower()

    place(white_pieces, True)
    place(black_pieces, False)

    fen_ranks = []
    for r in range(8):
        rank_str = ""
        empty = 0
        for f in range(8):
            if board[r][f]:
                if empty > 0:
                    rank_str += str(empty)
                    empty = 0
                rank_str += board[r][f]
            else:
                empty += 1
        if empty > 0:
            rank_str += str(empty)
        fen_ranks.append(rank_str)

    side = "b" if to_move == "black" else "w"
    castling_str = castling or "-"
    return f"{'/'.join(fen_ranks)} {side} {castling_str} - 0 1"


# --- Commands ---

def cmd_validate(args):
    result = validate_fen(args.fen)
    print(json.dumps(result, indent=2))


def cmd_url(args):
    validation = validate_fen(args.fen)
    if not validation["valid"]:
        print(json.dumps({"error": validation["error"]}), file=sys.stderr)
        sys.exit(1)
    url = build_url(validation["fen"], args.color)
    print(json.dumps({"url": url, "fen": validation["fen"]}, indent=2))


def cmd_open(args):
    validation = validate_fen(args.fen)
    if not validation["valid"]:
        print(json.dumps({"error": validation["error"]}), file=sys.stderr)
        sys.exit(1)
    url = build_url(validation["fen"], args.color)

    system = platform.system()
    if system == "Darwin":
        open_cmd = ["open", url]
    elif system == "Windows":
        open_cmd = ["start", url]
    else:
        open_cmd = ["xdg-open", url]

    try:
        subprocess.run(open_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(json.dumps({"opened": True, "url": url, "platform": system.lower()}, indent=2))
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(json.dumps({
            "opened": False,
            "url": url,
            "platform": system.lower(),
            "error": f"Failed to open browser. Visit: {url}",
        }, indent=2))


def cmd_board(args):
    validation = validate_fen(args.fen)
    if not validation["valid"]:
        print(f"Error: {validation['error']}", file=sys.stderr)
        sys.exit(1)
    print(render_board(validation["fen"], args.color))


def cmd_position(args):
    if not args.white and not args.black:
        print(json.dumps({"error": "Provide at least --white or --black piece list"}), file=sys.stderr)
        sys.exit(1)

    white_pieces = parse_piece_list(args.white) if args.white else []
    black_pieces = parse_piece_list(args.black) if args.black else []
    to_move = args.to_move or "white"
    castling = args.castling if args.castling else None

    fen = position_to_fen(white_pieces, black_pieces, to_move, castling)
    url = build_url(fen)

    print(json.dumps({
        "fen": fen,
        "url": url,
        "pieces": {"white": len(white_pieces), "black": len(black_pieces)},
    }, indent=2))


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Chess helper for Synapse")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # validate command
    p_validate = subparsers.add_parser("validate", help="Validate a FEN string")
    p_validate.add_argument("--fen", required=True, help="FEN string to validate")

    # url command
    p_url = subparsers.add_parser("url", help="Generate Lichess analysis URL")
    p_url.add_argument("--fen", required=True, help="FEN string")
    p_url.add_argument("--color", choices=["white", "black"], default=None, help="Board orientation")

    # open command
    p_open = subparsers.add_parser("open", help="Open position in browser on Lichess")
    p_open.add_argument("--fen", required=True, help="FEN string")
    p_open.add_argument("--color", choices=["white", "black"], default=None, help="Board orientation")

    # board command
    p_board = subparsers.add_parser("board", help="Render Unicode board to stdout")
    p_board.add_argument("--fen", required=True, help="FEN string")
    p_board.add_argument("--color", choices=["white", "black"], default=None, help="Board orientation")

    # position command
    p_position = subparsers.add_parser("position", help="Build FEN from piece lists")
    p_position.add_argument("--white", default=None, help='White pieces, e.g. "Ke1,Qd1,Ra1"')
    p_position.add_argument("--black", default=None, help='Black pieces, e.g. "Ke8,Qd8"')
    p_position.add_argument("--to-move", dest="to_move", choices=["white", "black"], default=None, help="Side to move")
    p_position.add_argument("--castling", default=None, help="Castling rights, e.g. KQkq or -")

    args = parser.parse_args()

    if args.command == "validate":
        cmd_validate(args)
    elif args.command == "url":
        cmd_url(args)
    elif args.command == "open":
        cmd_open(args)
    elif args.command == "board":
        cmd_board(args)
    elif args.command == "position":
        cmd_position(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
