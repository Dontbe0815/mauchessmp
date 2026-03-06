// Chess Game Logic - Complete Implementation
import { z } from 'zod';

// Piece types
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCastling?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  promotion?: PieceType;
}

export interface ChessState {
  board: (Piece | null)[][];
  currentPlayer: PieceColor;
  moveHistory: Move[];
  capturedPieces: { white: Piece[]; black: Piece[] };
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  enPassantTarget: Position | null;
  lastMove: Move | null;
  selectedPosition: Position | null;
  validMoves: Position[];
  gameMode: 'setup' | 'playing' | 'gameover';
  winner: PieceColor | null;
  timers: { white: number; black: number };
  useTimer: boolean;
  vsAI: boolean;
  aiColor: PieceColor;
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

// German piece names
export const pieceNames: Record<PieceType, string> = {
  king: 'König',
  queen: 'Dame',
  rook: 'Turm',
  bishop: 'Läufer',
  knight: 'Springer',
  pawn: 'Bauer',
};

// Piece symbols (Unicode chess pieces)
export const pieceSymbols: Record<PieceType, Record<PieceColor, string>> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
};

// Piece values for AI evaluation
const pieceValues: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Position bonus tables for piece-square evaluation
const pawnTable = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightTable = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopTable = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookTable = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenTable = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingMiddleTable = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const positionTables: Record<PieceType, number[][]> = {
  pawn: pawnTable,
  knight: knightTable,
  bishop: bishopTable,
  rook: rookTable,
  queen: queenTable,
  king: kingMiddleTable,
};

// Create initial board
export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
  }
  
  // Place other pieces
  const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black', hasMoved: false };
    board[7][col] = { type: backRank[col], color: 'white', hasMoved: false };
  }
  
  return board;
}

// Create initial game state
export function createInitialChessState(
  useTimer: boolean = false, 
  timerMinutes: number = 10,
  vsAI: boolean = false,
  aiColor: PieceColor = 'black',
  aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
): ChessState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'white',
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    enPassantTarget: null,
    lastMove: null,
    selectedPosition: null,
    validMoves: [],
    gameMode: 'playing',
    winner: null,
    timers: { white: timerMinutes * 60, black: timerMinutes * 60 },
    useTimer,
    vsAI,
    aiColor,
    aiDifficulty,
  };
}

// Check if position is on board
function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Get all possible moves for a piece (without considering check)
function getRawMoves(board: (Piece | null)[][], pos: Position, enPassantTarget: Position | null): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Position[] = [];
  const { row, col } = pos;

  switch (piece.type) {
    case 'pawn': {
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;

      // Forward move
      if (isOnBoard(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        // Double move from start
        if (row === startRow && !board[row + 2 * direction][col]) {
          moves.push({ row: row + 2 * direction, col });
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isOnBoard(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (target && target.color !== piece.color) {
            moves.push({ row: newRow, col: newCol });
          }
          // En passant
          if (enPassantTarget && enPassantTarget.row === newRow && enPassantTarget.col === newCol) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;
    }

    case 'knight': {
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isOnBoard(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.color !== piece.color) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;
    }

    case 'bishop': {
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isOnBoard(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      break;
    }

    case 'rook': {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isOnBoard(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      break;
    }

    case 'queen': {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
      ];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isOnBoard(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ row: newRow, col: newCol });
          } else {
            if (target.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
      break;
    }

    case 'king': {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
      ];
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isOnBoard(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.color !== piece.color) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Find king position
function findKing(board: (Piece | null)[][], color: PieceColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

// Check if a position is under attack
function isUnderAttack(board: (Piece | null)[][], pos: Position, byColor: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const moves = getRawMoves(board, { row, col }, null);
        if (moves.some(m => m.row === pos.row && m.col === pos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if player is in check
function isInCheck(board: (Piece | null)[][], color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isUnderAttack(board, kingPos, color === 'white' ? 'black' : 'white');
}

// Get valid moves (considering check)
function getValidMoves(board: (Piece | null)[][], pos: Position, enPassantTarget: Position | null): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, pos, enPassantTarget);
  const validMoves: Position[] = [];

  for (const move of rawMoves) {
    // Make the move temporarily
    const newBoard = board.map(row => [...row]);
    newBoard[move.row][move.col] = piece;
    newBoard[pos.row][pos.col] = null;

    // Handle en passant capture
    if (piece.type === 'pawn' && enPassantTarget && 
        move.row === enPassantTarget.row && move.col === enPassantTarget.col) {
      const capturedRow = piece.color === 'white' ? move.row + 1 : move.row - 1;
      newBoard[capturedRow][move.col] = null;
    }

    // Check if king is still safe
    if (!isInCheck(newBoard, piece.color)) {
      validMoves.push(move);
    }
  }

  // Add castling moves
  if (piece.type === 'king' && !piece.hasMoved && !isInCheck(board, piece.color)) {
    const homeRow = piece.color === 'white' ? 7 : 0;
    
    // Kingside castling
    const kingsideRook = board[homeRow][7];
    if (kingsideRook && kingsideRook.type === 'rook' && !kingsideRook.hasMoved) {
      if (!board[homeRow][5] && !board[homeRow][6]) {
        if (!isUnderAttack(board, { row: homeRow, col: 5 }, piece.color === 'white' ? 'black' : 'white') &&
            !isUnderAttack(board, { row: homeRow, col: 6 }, piece.color === 'white' ? 'black' : 'white')) {
          validMoves.push({ row: homeRow, col: 6 });
        }
      }
    }

    // Queenside castling
    const queensideRook = board[homeRow][0];
    if (queensideRook && queensideRook.type === 'rook' && !queensideRook.hasMoved) {
      if (!board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3]) {
        if (!isUnderAttack(board, { row: homeRow, col: 2 }, piece.color === 'white' ? 'black' : 'white') &&
            !isUnderAttack(board, { row: homeRow, col: 3 }, piece.color === 'white' ? 'black' : 'white')) {
          validMoves.push({ row: homeRow, col: 2 });
        }
      }
    }
  }

  return validMoves;
}

// Check if player has any valid moves
function hasAnyValidMoves(board: (Piece | null)[][], color: PieceColor, enPassantTarget: Position | null): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row, col }, enPassantTarget);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

// Make a move
export function makeMove(state: ChessState, from: Position, to: Position, promotion?: PieceType): ChessState {
  const piece = state.board[from.row][from.col];
  if (!piece || piece.color !== state.currentPlayer) return state;

  const validMoves = getValidMoves(state.board, from, state.enPassantTarget);
  const isValidMove = validMoves.some(m => m.row === to.row && m.col === to.col);
  if (!isValidMove) return state;

  // Create new board
  const newBoard = state.board.map(row => [...row]);
  let newPiece = { ...piece, hasMoved: true };
  let captured: Piece | undefined;
  let isCastling: 'kingside' | 'queenside' | undefined;
  let isEnPassant = false;
  let newEnPassantTarget: Position | null = null;

  // Handle captures
  const target = newBoard[to.row][to.col];
  if (target) {
    captured = target;
  }

  // Handle en passant
  if (piece.type === 'pawn' && state.enPassantTarget &&
      to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
    const capturedRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
    captured = newBoard[capturedRow][to.col] || undefined;
    newBoard[capturedRow][to.col] = null;
    isEnPassant = true;
  }

  // Set en passant target for double pawn moves
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    newEnPassantTarget = {
      row: (from.row + to.row) / 2,
      col: from.col
    };
  }

  // Handle castling
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    const homeRow = piece.color === 'white' ? 7 : 0;
    if (to.col === 6) {
      // Kingside
      isCastling = 'kingside';
      newBoard[homeRow][5] = { ...newBoard[homeRow][7]!, hasMoved: true };
      newBoard[homeRow][7] = null;
    } else if (to.col === 2) {
      // Queenside
      isCastling = 'queenside';
      newBoard[homeRow][3] = { ...newBoard[homeRow][0]!, hasMoved: true };
      newBoard[homeRow][0] = null;
    }
  }

  // Handle promotion
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    newPiece = { ...newPiece, type: promotion || 'queen' };
  }

  // Move the piece
  newBoard[to.row][to.col] = newPiece;
  newBoard[from.row][from.col] = null;

  // Update captured pieces
  const newCaptured = { ...state.capturedPieces };
  if (captured) {
    if (captured.color === 'white') {
      newCaptured.white = [...newCaptured.white, captured];
    } else {
      newCaptured.black = [...newCaptured.black, captured];
    }
  }

  // Switch player
  const nextPlayer = state.currentPlayer === 'white' ? 'black' : 'white';

  // Check game state
  const isNextInCheck = isInCheck(newBoard, nextPlayer);
  const hasNextMoves = hasAnyValidMoves(newBoard, nextPlayer, newEnPassantTarget);
  const isCheckmate = isNextInCheck && !hasNextMoves;
  const isStalemate = !isNextInCheck && !hasNextMoves;

  // Create move record
  const move: Move = {
    from,
    to,
    piece,
    captured,
    isCheck: isNextInCheck,
    isCheckmate,
    isCastling,
    isEnPassant,
    promotion: newPiece.type !== piece.type ? newPiece.type : undefined,
  };

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    moveHistory: [...state.moveHistory, move],
    capturedPieces: newCaptured,
    isCheck: isNextInCheck,
    isCheckmate,
    isStalemate,
    enPassantTarget: newEnPassantTarget,
    lastMove: move,
    selectedPosition: null,
    validMoves: [],
    gameMode: isCheckmate || isStalemate ? 'gameover' : 'playing',
    winner: isCheckmate ? state.currentPlayer : null,
  };
}

// Select a piece
export function selectPiece(state: ChessState, pos: Position): ChessState {
  const piece = state.board[pos.row][pos.col];
  
  if (!piece || piece.color !== state.currentPlayer) {
    // Try to move to this position if a piece is selected
    if (state.selectedPosition) {
      return makeMove(state, state.selectedPosition, pos);
    }
    return { ...state, selectedPosition: null, validMoves: [] };
  }

  const validMoves = getValidMoves(state.board, pos, state.enPassantTarget);
  return { ...state, selectedPosition: pos, validMoves };
}

// Get board notation for a position
export function getNotation(pos: Position): string {
  const colLetter = String.fromCharCode(97 + pos.col); // a-h
  const rowNum = 8 - pos.row; // 8-1
  return `${colLetter}${rowNum}`;
}

// Get move notation
export function getMoveNotation(move: Move): string {
  const pieceSymbol = move.piece.type === 'pawn' ? '' : move.piece.type[0].toUpperCase();
  const from = getNotation(move.from);
  const to = getNotation(move.to);
  const capture = move.captured ? 'x' : '-';
  
  if (move.isCastling === 'kingside') return 'O-O';
  if (move.isCastling === 'queenside') return 'O-O-O';
  
  let notation = `${pieceSymbol}${from}${capture}${to}`;
  
  if (move.promotion) {
    notation += `=${move.promotion[0].toUpperCase()}`;
  }
  if (move.isCheckmate) {
    notation += '#';
  } else if (move.isCheck) {
    notation += '+';
  }
  
  return notation;
}

// Undo last move (simplified - doesn't restore all state perfectly)
export function undoMove(state: ChessState): ChessState {
  if (state.moveHistory.length === 0) return state;
  
  // For simplicity, restart and replay all moves except the last
  const movesToReplay = state.moveHistory.slice(0, -1);
  let newState = createInitialChessState(state.useTimer, state.timers.white / 60, state.vsAI, state.aiColor, state.aiDifficulty);
  
  for (const move of movesToReplay) {
    newState = makeMove(newState, move.from, move.to, move.promotion);
  }
  
  return newState;
}

// ==================== AI Functions ====================

// Evaluate board position for a color
function evaluateBoard(board: (Piece | null)[][], color: PieceColor): number {
  let score = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const pieceValue = pieceValues[piece.type];
      const table = positionTables[piece.type];
      
      // Get position bonus (flip for black)
      const tableRow = piece.color === 'white' ? row : 7 - row;
      const positionBonus = table[tableRow][col];
      
      if (piece.color === color) {
        score += pieceValue + positionBonus;
      } else {
        score -= pieceValue + positionBonus;
      }
    }
  }
  
  return score;
}

// Get all valid moves for a color
function getAllMovesForColor(
  board: (Piece | null)[][], 
  color: PieceColor, 
  enPassantTarget: Position | null
): { from: Position; to: Position; piece: Piece }[] {
  const moves: { from: Position; to: Position; piece: Piece }[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const validMoves = getValidMoves(board, { row, col }, enPassantTarget);
        for (const move of validMoves) {
          moves.push({ from: { row, col }, to: move, piece });
        }
      }
    }
  }
  
  return moves;
}

// Make a temporary move for AI calculation
function makeTemporaryMove(
  board: (Piece | null)[][], 
  from: Position, 
  to: Position,
  enPassantTarget: Position | null
): { board: (Piece | null)[][]; newEnPassant: Position | null } {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];
  if (!piece) return { board: newBoard, newEnPassant: null };
  
  let newEnPassant: Position | null = null;
  
  // Handle en passant
  if (piece.type === 'pawn' && enPassantTarget && 
      to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
    const capturedRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
    newBoard[capturedRow][to.col] = null;
  }
  
  // Set en passant target for double pawn moves
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    newEnPassant = { row: (from.row + to.row) / 2, col: from.col };
  }
  
  // Handle castling
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    const homeRow = piece.color === 'white' ? 7 : 0;
    if (to.col === 6) {
      newBoard[homeRow][5] = newBoard[homeRow][7];
      newBoard[homeRow][7] = null;
    } else if (to.col === 2) {
      newBoard[homeRow][3] = newBoard[homeRow][0];
      newBoard[homeRow][0] = null;
    }
  }
  
  // Handle promotion
  let movedPiece = piece;
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    movedPiece = { ...piece, type: 'queen' };
  }
  
  newBoard[to.row][to.col] = { ...movedPiece, hasMoved: true };
  newBoard[from.row][from.col] = null;
  
  return { board: newBoard, newEnPassant };
}

// Minimax with alpha-beta pruning
function minimax(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  color: PieceColor,
  enPassantTarget: Position | null
): number {
  const currentColor = maximizingPlayer ? color : (color === 'white' ? 'black' : 'white');
  
  // Terminal conditions
  if (depth === 0) {
    return evaluateBoard(board, color);
  }
  
  const moves = getAllMovesForColor(board, currentColor, enPassantTarget);
  
  // Check for checkmate or stalemate
  if (moves.length === 0) {
    if (isInCheck(board, currentColor)) {
      return maximizingPlayer ? -100000 + depth : 100000 - depth;
    }
    return 0; // Stalemate
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { board: newBoard, newEnPassant } = makeTemporaryMove(
        board, move.from, move.to, enPassantTarget
      );
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, color, newEnPassant);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { board: newBoard, newEnPassant } = makeTemporaryMove(
        board, move.from, move.to, enPassantTarget
      );
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, color, newEnPassant);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

// Get best move for AI
export function getBestMove(
  state: ChessState,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Position | null {
  const { board, currentPlayer, enPassantTarget } = state;
  const moves = getAllMovesForColor(board, currentPlayer, enPassantTarget);
  
  if (moves.length === 0) return null;
  
  // Easy: Random move
  if (difficulty === 'easy') {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return randomMove.to;
  }
  
  // Set search depth based on difficulty
  const depth = difficulty === 'medium' ? 2 : 3;
  
  let bestMove: Position | null = null;
  let bestValue = -Infinity;
  
  // Shuffle moves for variety
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);
  
  for (const move of shuffledMoves) {
    const { board: newBoard, newEnPassant } = makeTemporaryMove(
      board, move.from, move.to, enPassantTarget
    );
    
    const moveValue = minimax(
      newBoard, 
      depth - 1, 
      -Infinity, 
      Infinity, 
      false, 
      currentPlayer,
      newEnPassant
    );
    
    if (moveValue > bestValue) {
      bestValue = moveValue;
      bestMove = move.to;
    }
  }
  
  return bestMove;
}

// Get AI move (returns both from and to positions)
export function getAIMove(
  state: ChessState,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { from: Position; to: Position } | null {
  const { board, currentPlayer, enPassantTarget } = state;
  const moves = getAllMovesForColor(board, currentPlayer, enPassantTarget);
  
  if (moves.length === 0) return null;
  
  // Easy: Random move
  if (difficulty === 'easy') {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return { from: randomMove.from, to: randomMove.to };
  }
  
  // Set search depth based on difficulty
  const depth = difficulty === 'medium' ? 2 : 3;
  
  let bestMove: { from: Position; to: Position } | null = null;
  let bestValue = -Infinity;
  
  // Shuffle moves for variety
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);
  
  for (const move of shuffledMoves) {
    const { board: newBoard, newEnPassant } = makeTemporaryMove(
      board, move.from, move.to, enPassantTarget
    );
    
    const moveValue = minimax(
      newBoard, 
      depth - 1, 
      -Infinity, 
      Infinity, 
      false, 
      currentPlayer,
      newEnPassant
    );
    
    if (moveValue > bestValue) {
      bestValue = moveValue;
      bestMove = { from: move.from, to: move.to };
    }
  }
  
  return bestMove;
}
