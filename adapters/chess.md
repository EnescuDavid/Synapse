# Domain Adapter: Chess

## Identity
- **Domain**: chess
- **Description**: Chess study — openings, tactics, positional play, endgames, and game analysis
- **Detect**: chess, openings, tactics, endgame, middlegame, elo, lichess, pgn, fen, checkmate, castling, en passant, pawn structure, piece activity, king safety

## Interaction Patterns

### Chat-only (Remember / Understand)
Describe a position or concept, optionally open Lichess for visual reference. Learner answers in chat.

### Play-and-report (Apply / Analyze)
Open the position on Lichess (`chess-helper.js open`), then wait for the learner to play. Learner reports their moves in algebraic notation (e.g. "1.Nxe5 dxe5 2.Qh5"). Evaluate the reported move sequence — do not ask the learner to paste PGN or FEN back.

### Extended analysis (Evaluate / Create)
Open position on Lichess. Learner studies deeply, forms their own judgment (plan, assessment, candidate moves), then reports back for discussion before checking the engine.

## Exercise Formats

### Remember
- "What is the value of a bishop?"
- "What does castling require?"
- "Name the opening: 1.e4 e5 2.Nf3 Nc6 3.Bb5"
- Multiple choice on rules, notation, or piece values
- Format: chat Q&A

### Understand
- "Why is White winning in this position?" (with board on Lichess)
- "What happens if Black plays ...Nxe4 here?"
- "Explain why the bishop is better than the knight in this endgame"
- Format: Lichess visual + chat explanation

### Apply
- "Find the winning tactic — White to play" (play-and-report)
- "Play the first 5 moves of the Italian Game as White" (play-and-report)
- "Find the checkmate in 2" (play-and-report)
- Format: position opened on Lichess, learner reports moves

### Analyze
- "Assess the imbalances in this position"
- "Compare 1.Nf3 vs 1.d4 — which is better and why?"
- "What are Black's candidate moves? Rank them."
- Format: extended analysis on Lichess

### Evaluate
- "Find the turning point in this game" (game review)
- "Critique White's plan in moves 15-25"
- "Was the sacrifice sound? Justify your answer."
- Format: game analysis with critical thinking

### Create
- "Construct a plan for White in this middlegame position"
- "Design a repertoire against 1.d4 for Black"
- "Compose a checkmate-in-3 puzzle"
- Format: synthesis — learner builds, Claude reviews

## File Patterns
- **Exercise directory**: `exercises/[module]/`
- **Position files**: `[concept].md` — contains FEN, diagram, prompt, solution
- **Game files**: `[concept].pgn` — annotated games for analysis exercises
- **Naming**: `[concept-id].md` (e.g., `knight-fork.md`, `sicilian-najdorf.md`)

## Assessment Rules
- **Primary**: Grade reasoning quality, not just move accuracy
- **Never** use engine evaluation as primary feedback — Stockfish confirms, not teaches
- **Notation**: Accept variants — `Nf3`, `Nf3!`, `O-O`, `0-0`, `e.p.` are all valid
- **Partial credit**: Right first move but wrong follow-up → grade 2 (Hard)
- **Multiple valid moves**: In positional play, grade on strategic soundness + justification, not on matching a single "best" move
- **Tactics**: Exact sequence required for full credit; grade 3 requires the key move
- **Explanations**: At Understand+, require the learner to explain "why", not just "what"

## Scaffolding
- **Level 5** (most help): Multiple choice — "Which move wins? a) Nxe5 b) Bf4 c) Qh5"
- **Level 4**: Tactic type hint — "Look for a discovered attack"
- **Level 3**: First move shown — "After 1.Nxe5, what's the follow-up?"
- **Level 2**: Search narrowed — "The winning move involves the knight"
- **Level 1** (least help): No hint — "White to play and win"

## Tools
- **Validate FEN**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chess/chess-helper.js validate --fen "<FEN>"`
- **Lichess URL**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chess/chess-helper.js url --fen "<FEN>" [--color white|black]`
- **Open in browser**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chess/chess-helper.js open --fen "<FEN>" [--color white|black]`
- **Unicode board**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chess/chess-helper.js board --fen "<FEN>" [--color white|black]`
- **Build FEN from pieces**: `node ${CLAUDE_PLUGIN_ROOT}/scripts/chess/chess-helper.js position --white "Ke1,Qd1" --black "Ke8" [--to-move white|black] [--castling KQkq]`

Use `position` to construct FEN from piece lists instead of writing FEN strings directly — this avoids LLM FEN miscounting errors.

## Common Misconceptions
- Material vs positional factors — overvaluing material, ignoring activity and king safety
- Check vs checkmate vs stalemate — confusing "check" with "checkmate", missing stalemate
- Bishop vs knight — context-dependent value, not absolute ("bishop is always better")
- Castling prerequisites — must not have moved king or rook, must not castle through/out of check, squares between must be empty
- En passant timing — only available immediately after the opposing pawn's double move
- Pawn promotion — forgetting underpromotion as an option
- Piece coordination — moving pieces individually instead of coordinating attacks
- Opening principles vs memorization — knowing moves without understanding the ideas
