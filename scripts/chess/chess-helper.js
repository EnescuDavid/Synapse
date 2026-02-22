#!/usr/bin/env node
/**
 * Chess Helper — CLI tool for Synapse's chess domain adapter.
 * Opens positions on Lichess, validates FEN, renders boards.
 *
 * Usage:
 *   node chess-helper.js validate --fen "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 *   node chess-helper.js url --fen "<FEN>" [--color black]
 *   node chess-helper.js open --fen "<FEN>" [--color black]
 *   node chess-helper.js board --fen "<FEN>" [--color black]
 *   node chess-helper.js position --white "Ke1,Qd1" --black "Ke8" [--to-move white] [--castling KQkq]
 */

const { execSync } = require("child_process");

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

// --- FEN validation (structural only, v1) ---

const PIECE_CHARS = "pnbrqkPNBRQK";
const WHITE_PIECES = { K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn" };
const BLACK_PIECES = { k: "King", q: "Queen", r: "Rook", b: "Bishop", n: "Knight", p: "Pawn" };

function validateFen(fen) {
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 1 || fields.length > 6) {
    return { valid: false, error: `FEN must have 1-6 fields, got ${fields.length}` };
  }

  // Fill defaults for missing fields
  const placement = fields[0];
  const sideToMove = fields[1] || "w";
  const castling = fields[2] || "-";
  const enPassant = fields[3] || "-";
  const halfmove = fields[4] || "0";
  const fullmove = fields[5] || "1";

  // Validate piece placement
  const ranks = placement.split("/");
  if (ranks.length !== 8) {
    return { valid: false, error: `Expected 8 ranks, got ${ranks.length}` };
  }

  let whitePieces = 0;
  let blackPieces = 0;

  for (let i = 0; i < 8; i++) {
    const rank = ranks[i];
    let squares = 0;
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        squares += parseInt(ch, 10);
      } else if (PIECE_CHARS.includes(ch)) {
        squares += 1;
        if (ch === ch.toUpperCase()) whitePieces++;
        else blackPieces++;
      } else {
        return { valid: false, error: `Invalid character '${ch}' in rank ${i + 1}` };
      }
    }
    if (squares !== 8) {
      return { valid: false, error: `Rank ${i + 1} has ${squares} squares (expected 8)` };
    }
  }

  // Validate side to move
  if (sideToMove !== "w" && sideToMove !== "b") {
    return { valid: false, error: `Side to move must be 'w' or 'b', got '${sideToMove}'` };
  }

  // Validate castling
  if (castling !== "-" && !/^[KQkq]{1,4}$/.test(castling)) {
    return { valid: false, error: `Invalid castling rights: '${castling}'` };
  }

  // Validate en passant
  if (enPassant !== "-" && !/^[a-h][36]$/.test(enPassant)) {
    return { valid: false, error: `Invalid en passant square: '${enPassant}'` };
  }

  // Validate halfmove and fullmove clocks
  if (!/^\d+$/.test(halfmove) || parseInt(halfmove, 10) < 0) {
    return { valid: false, error: `Invalid halfmove clock: '${halfmove}'` };
  }
  if (!/^\d+$/.test(fullmove) || parseInt(fullmove, 10) < 1) {
    return { valid: false, error: `Invalid fullmove number: '${fullmove}'` };
  }

  const fullFen = `${placement} ${sideToMove} ${castling} ${enPassant} ${halfmove} ${fullmove}`;

  return {
    valid: true,
    fen: fullFen,
    pieces: { white: whitePieces, black: blackPieces },
    side_to_move: sideToMove === "w" ? "white" : "black",
    castling,
    en_passant: enPassant,
  };
}

// --- URL generation ---

function buildUrl(fen, color) {
  const urlFen = fen.replace(/ /g, "_");
  let url = `https://lichess.org/analysis/standard/${urlFen}`;
  if (color === "black") url += "?color=black";
  return url;
}

// --- Board rendering ---

const UNICODE_PIECES = {
  K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};

function renderBoard(fen, color) {
  const placement = fen.split(/\s+/)[0];
  const ranks = placement.split("/");
  const board = [];

  for (const rank of ranks) {
    const row = [];
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        for (let j = 0; j < parseInt(ch, 10); j++) row.push("\u00B7");
      } else {
        row.push(UNICODE_PIECES[ch] || ch);
      }
    }
    board.push(row);
  }

  const lines = [];
  if (color === "black") {
    for (let r = 7; r >= 0; r--) {
      const rankNum = r + 1;
      lines.push(`  ${rankNum}  ${board[8 - 1 - r].slice().reverse().join(" ")}`);
    }
    lines.push("     h g f e d c b a");
  } else {
    for (let r = 0; r < 8; r++) {
      const rankNum = 8 - r;
      lines.push(`  ${rankNum}  ${board[r].join(" ")}`);
    }
    lines.push("     a b c d e f g h");
  }

  return lines.join("\n");
}

// --- Position from piece lists ---

const FILES = "abcdefgh";

function parsePieceList(list) {
  const pieces = [];
  for (const entry of list.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    // Format: Xe1 where X is piece letter (K,Q,R,B,N,P) and e1 is square
    if (trimmed.length < 3 || trimmed.length > 3) {
      throw new Error(`Invalid piece entry '${trimmed}': expected format like 'Ke1'`);
    }

    const piece = trimmed[0];
    if (!"KQRBNPkqrbnp".includes(piece.toUpperCase())) {
      throw new Error(`Invalid piece letter '${piece}' in '${trimmed}'`);
    }

    const file = trimmed[1];
    const rank = trimmed[2];
    if (!FILES.includes(file) || rank < "1" || rank > "8") {
      throw new Error(`Invalid square '${file}${rank}' in '${trimmed}'`);
    }

    pieces.push({ piece, file: FILES.indexOf(file), rank: parseInt(rank, 10) - 1 });
  }
  return pieces;
}

function positionToFen(whitePieces, blackPieces, toMove, castling) {
  // Initialize empty board (8x8, rank 0 = rank 8 in chess)
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const occupied = new Set();

  function place(pieces, isWhite) {
    for (const p of pieces) {
      const boardRank = 7 - p.rank; // rank 1 = index 7, rank 8 = index 0
      const key = `${p.file},${boardRank}`;
      if (occupied.has(key)) {
        throw new Error(`Duplicate square: ${FILES[p.file]}${p.rank + 1}`);
      }
      occupied.add(key);
      board[boardRank][p.file] = isWhite ? p.piece.toUpperCase() : p.piece.toLowerCase();
    }
  }

  place(whitePieces, true);
  place(blackPieces, false);

  // Serialize to FEN
  const fenRanks = [];
  for (let r = 0; r < 8; r++) {
    let rankStr = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      if (board[r][f]) {
        if (empty > 0) { rankStr += empty; empty = 0; }
        rankStr += board[r][f];
      } else {
        empty++;
      }
    }
    if (empty > 0) rankStr += empty;
    fenRanks.push(rankStr);
  }

  const side = toMove === "black" ? "b" : "w";
  const castlingStr = castling || "-";
  return `${fenRanks.join("/")} ${side} ${castlingStr} - 0 1`;
}

// --- Commands ---

function cmdValidate(args) {
  if (!args.fen) {
    console.error(JSON.stringify({ error: "Missing --fen argument" }));
    process.exit(1);
  }
  const result = validateFen(args.fen);
  console.log(JSON.stringify(result, null, 2));
}

function cmdUrl(args) {
  if (!args.fen) {
    console.error(JSON.stringify({ error: "Missing --fen argument" }));
    process.exit(1);
  }
  const validation = validateFen(args.fen);
  if (!validation.valid) {
    console.error(JSON.stringify({ error: validation.error }));
    process.exit(1);
  }
  const url = buildUrl(validation.fen, args.color);
  console.log(JSON.stringify({ url, fen: validation.fen }, null, 2));
}

function cmdOpen(args) {
  if (!args.fen) {
    console.error(JSON.stringify({ error: "Missing --fen argument" }));
    process.exit(1);
  }
  const validation = validateFen(args.fen);
  if (!validation.valid) {
    console.error(JSON.stringify({ error: validation.error }));
    process.exit(1);
  }
  const url = buildUrl(validation.fen, args.color);

  let openCmd;
  switch (process.platform) {
    case "darwin": openCmd = "open"; break;
    case "win32": openCmd = "start"; break;
    default: openCmd = "xdg-open"; break;
  }

  try {
    execSync(`${openCmd} "${url}"`, { stdio: "ignore" });
    console.log(JSON.stringify({ opened: true, url, platform: process.platform }, null, 2));
  } catch (err) {
    console.log(JSON.stringify({
      opened: false,
      url,
      platform: process.platform,
      error: `Failed to open browser. Visit: ${url}`,
    }, null, 2));
  }
}

function cmdBoard(args) {
  if (!args.fen) {
    console.error(JSON.stringify({ error: "Missing --fen argument" }));
    process.exit(1);
  }
  const validation = validateFen(args.fen);
  if (!validation.valid) {
    console.error("Error: " + validation.error);
    process.exit(1);
  }
  console.log(renderBoard(validation.fen, args.color));
}

function cmdPosition(args) {
  if (!args.white && !args.black) {
    console.error(JSON.stringify({ error: "Provide at least --white or --black piece list" }));
    process.exit(1);
  }

  const whitePieces = args.white ? parsePieceList(args.white) : [];
  const blackPieces = args.black ? parsePieceList(args.black) : [];
  const toMove = args["to-move"] || "white";
  const castling = args.castling || undefined;

  const fen = positionToFen(whitePieces, blackPieces, toMove, castling);
  const url = buildUrl(fen, undefined);

  console.log(JSON.stringify({
    fen,
    url,
    pieces: { white: whitePieces.length, black: blackPieces.length },
  }, null, 2));
}

// --- Main ---

const args = parseArgs(process.argv);
const command = args._[0];

if (!command) {
  console.error("Usage: chess-helper.js <validate|url|open|board|position> [options]");
  process.exit(1);
}

try {
  switch (command) {
    case "validate": cmdValidate(args); break;
    case "url": cmdUrl(args); break;
    case "open": cmdOpen(args); break;
    case "board": cmdBoard(args); break;
    case "position": cmdPosition(args); break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
}
