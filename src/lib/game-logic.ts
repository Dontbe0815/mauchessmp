// Mau Mau Game Logic
import {
  Card,
  Suit,
  Value,
  Player,
  GameState,
  GameRules,
  Direction,
  defaultRules,
} from './types';

// All suits and values
const suits: Suit[] = ['herz', 'karo', 'kreuz', 'pik'];
const values: Value[] = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create a full 32-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        id: generateId(),
        suit,
        value,
      });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards to players
export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = [];
  let remainingDeck = [...deck];

  for (let i = 0; i < playerCount; i++) {
    hands.push(remainingDeck.splice(0, cardsPerPlayer));
  }

  return { hands, remainingDeck };
}

// Find a playable starting card (not a special card)
export function findStartingCard(deck: Card[]): Card | null {
  // Find a card that's not a 7, 8, 9, B, or A (special cards)
  const specialValues: Value[] = ['7', '8', '9', 'B', 'A'];
  return deck.find(card => !specialValues.includes(card.value)) || deck[0] || null;
}

// Check if a card can be played on top of another
export function canPlayCard(
  card: Card,
  topCard: Card,
  currentSuit: Suit | null,
  rules: GameRules,
  isJack: boolean = false
): boolean {
  // Jack can always be played (if bubeRegel is enabled)
  if (card.value === 'B' && rules.bubeRegel) {
    return true;
  }

  // Check if card matches current suit or top card value
  const matchesSuit = currentSuit ? card.suit === currentSuit : card.suit === topCard.suit;
  const matchesValue = card.value === topCard.value;

  // Jack on Jack is only allowed with matching suit
  if (topCard.value === 'B' && card.value === 'B') {
    return card.suit === topCard.suit;
  }

  return matchesSuit || matchesValue;
}

// Check if player has any playable cards
export function hasPlayableCards(
  hand: Card[],
  topCard: Card,
  currentSuit: Suit | null,
  rules: GameRules
): boolean {
  return hand.some(card => canPlayCard(card, topCard, currentSuit, rules));
}

// Get all playable cards from a hand
export function getPlayableCards(
  hand: Card[],
  topCard: Card,
  currentSuit: Suit | null,
  rules: GameRules
): Card[] {
  return hand.filter(card => canPlayCard(card, topCard, currentSuit, rules));
}

// Create initial game state
export function createInitialGameState(
  playerNames: string[],
  rules: GameRules = defaultRules,
  initialCardCount: number = 5
): GameState {
  const deck = shuffleDeck(createDeck());
  const { hands, remainingDeck } = dealCards(deck, playerNames.length, initialCardCount);

  // Find a starting card for the discard pile
  let discardPile: Card[] = [];
  let drawPile = [...remainingDeck];
  
  const startCard = findStartingCard(drawPile);
  if (startCard) {
    discardPile.push(startCard);
    drawPile = drawPile.filter(c => c.id !== startCard.id);
  }

  const players: Player[] = playerNames.map((name, index) => ({
    id: generateId(),
    name: name || `Spieler ${index + 1}`,
    hand: hands[index],
    hasSaidMau: false,
    hasSaidMauMau: false,
    mustDraw: 0,
    isSkipped: false,
  }));

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    direction: 'clockwise',
    drawPile,
    discardPile,
    currentSuit: discardPile[0]?.suit || null,
    rules,
    pendingSuitSelection: null,
    announcements: [],
    winner: null,
    initialCardCount,
    lastDrawnCard: null,
    canPlayDrawnCard: false,
    showHand: true,
  };
}

// Get next player index based on direction
export function getNextPlayerIndex(
  currentIndex: number,
  playerCount: number,
  direction: Direction
): number {
  if (direction === 'clockwise') {
    return (currentIndex + 1) % playerCount;
  } else {
    return (currentIndex - 1 + playerCount) % playerCount;
  }
}

// Play a card and update game state
export function playCard(
  state: GameState,
  playerId: string,
  cardId: string
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) {
    return state;
  }

  const player = state.players[playerIndex];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    return state;
  }

  const card = player.hand[cardIndex];
  const topCard = state.discardPile[state.discardPile.length - 1];

  // Check if card can be played
  if (!canPlayCard(card, topCard, state.currentSuit, state.rules)) {
    return state;
  }

  // Remove card from hand and add to discard pile
  const newHand = player.hand.filter(c => c.id !== cardId);
  const newDiscardPile = [...state.discardPile, card];

  // Check for Mau/Mau Mau rules
  let hasSaidMau = player.hasSaidMau;
  let hasSaidMauMau = player.hasSaidMauMau;
  
  // Reset Mau flags when playing a card
  if (newHand.length === 1 && state.rules.mauSagen) {
    hasSaidMau = false;
  }

  // Update player
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    hasSaidMau,
    hasSaidMauMau,
  };

  // Check for winner
  if (newHand.length === 0) {
    // Check if player said Mau Mau when required
    if (state.rules.mauMauSagen && !hasSaidMauMau) {
      // Penalty: draw 2 cards
      const penaltyCards = state.drawPile.slice(0, 2);
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        hand: [...newHand, ...penaltyCards],
      };
      return {
        ...state,
        players: newPlayers,
        drawPile: state.drawPile.slice(2),
        announcements: [
          ...state.announcements,
          {
            id: generateId(),
            message: `${player.name} hat nicht "Mau Mau" gesagt! 2 Strafkarten gezogen!`,
            type: 'warning' as const,
          },
        ],
      };
    }

    return {
      ...state,
      players: newPlayers,
      discardPile: newDiscardPile,
      phase: 'gameOver',
      winner: newPlayers[playerIndex],
      announcements: [
        ...state.announcements,
        {
          id: generateId(),
          message: `${player.name} hat gewonnen!`,
          type: 'success' as const,
        },
      ],
    };
  }

  // Check if suit selection is needed (Jack or Ace)
  if ((card.value === 'B' && state.rules.bubeRegel) || (card.value === 'A' && state.rules.assRegel)) {
    return {
      ...state,
      players: newPlayers,
      discardPile: newDiscardPile,
      phase: 'suitSelection',
      pendingSuitSelection: {
        playerId: player.id,
        cardId: card.id,
      },
      currentSuit: null, // Will be set after selection
    };
  }

  // Apply special card effects
  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: newDiscardPile,
    currentSuit: card.suit,
  };

  // 7 rule: next player draws 2
  if (card.value === '7' && state.rules.siebenRegel) {
    const nextPlayerIndex = getNextPlayerIndex(
      state.currentPlayerIndex,
      state.players.length,
      state.direction
    );
    const nextPlayer = newState.players[nextPlayerIndex];
    newState.players[nextPlayerIndex] = {
      ...nextPlayer,
      mustDraw: nextPlayer.mustDraw + 2,
    };
    newState.announcements = [
      ...newState.announcements,
      {
        id: generateId(),
        message: `${nextPlayer.name} muss 2 Karten ziehen!`,
        type: 'warning' as const,
      },
    ];
  }

  // 8 rule: next player skips
  if (card.value === '8' && state.rules.achtRegel) {
    const nextPlayerIndex = getNextPlayerIndex(
      state.currentPlayerIndex,
      state.players.length,
      state.direction
    );
    const nextPlayer = newState.players[nextPlayerIndex];
    newState.players[nextPlayerIndex] = {
      ...nextPlayer,
      isSkipped: true,
    };
    newState.announcements = [
      ...newState.announcements,
      {
        id: generateId(),
        message: `${nextPlayer.name} wird übersprungen!`,
        type: 'info' as const,
      },
    ];
  }

  // 9 rule: reverse direction
  if (card.value === '9' && state.rules.neunRegel) {
    newState.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
    newState.announcements = [
      ...newState.announcements,
      {
        id: generateId(),
        message: 'Richtung geändert!',
        type: 'info' as const,
      },
    ];
  }

  return newState;
}

// Draw a card from the deck
export function drawCard(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) {
    return state;
  }

  const player = state.players[playerIndex];

  // Check if player needs to draw penalty cards
  const cardsToDraw = Math.max(player.mustDraw, 1);
  
  if (state.drawPile.length === 0) {
    // Reshuffle discard pile into draw pile
    if (state.discardPile.length <= 1) {
      return state; // Can't draw, no cards available
    }
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    const newDrawPile = shuffleDeck(state.discardPile.slice(0, -1));
    
    const drawnCards = newDrawPile.slice(0, cardsToDraw);
    const remainingDrawPile = newDrawPile.slice(cardsToDraw);
    
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: [...player.hand, ...drawnCards],
      mustDraw: 0,
      hasSaidMau: false,
      hasSaidMauMau: false,
    };

    return {
      ...state,
      players: newPlayers,
      drawPile: remainingDrawPile,
      discardPile: [topCard],
      lastDrawnCard: drawnCards[drawnCards.length - 1] || null,
      canPlayDrawnCard: drawnCards.length > 0,
      announcements: cardsToDraw > 1 ? [
        ...state.announcements,
        {
          id: generateId(),
          message: `${player.name} zieht ${cardsToDraw} Karten!`,
          type: 'info' as const,
        },
      ] : state.announcements,
    };
  }

  const drawnCards = state.drawPile.slice(0, cardsToDraw);
  const newDrawPile = state.drawPile.slice(cardsToDraw);

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: [...player.hand, ...drawnCards],
    mustDraw: 0,
    hasSaidMau: false,
    hasSaidMauMau: false,
  };

  const lastDrawn = drawnCards[drawnCards.length - 1] || null;
  const topCard = state.discardPile[state.discardPile.length - 1];
  const canPlay = lastDrawn && canPlayCard(lastDrawn, topCard, state.currentSuit, state.rules);

  return {
    ...state,
    players: newPlayers,
    drawPile: newDrawPile,
    lastDrawnCard: lastDrawn,
    canPlayDrawnCard: !!canPlay,
    announcements: cardsToDraw > 1 ? [
      ...state.announcements,
      {
        id: generateId(),
        message: `${player.name} zieht ${cardsToDraw} Karten!`,
        type: 'info' as const,
      },
    ] : state.announcements,
  };
}

// Select a suit after playing Jack or Ace
export function selectSuit(state: GameState, suit: Suit): GameState {
  if (state.phase !== 'suitSelection' || !state.pendingSuitSelection) {
    return state;
  }

  const { playerId } = state.pendingSuitSelection;
  const playerIndex = state.players.findIndex(p => p.id === playerId);

  // Move to next player
  let nextIndex = getNextPlayerIndex(
    playerIndex,
    state.players.length,
    state.direction
  );

  // Check if next player is skipped
  if (state.players[nextIndex].isSkipped) {
    const newPlayers = [...state.players];
    newPlayers[nextIndex] = {
      ...newPlayers[nextIndex],
      isSkipped: false,
    };
    nextIndex = getNextPlayerIndex(nextIndex, state.players.length, state.direction);
    
    return {
      ...state,
      players: newPlayers,
      currentPlayerIndex: nextIndex,
      phase: 'playing',
      currentSuit: suit,
      pendingSuitSelection: null,
      showHand: false,
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    phase: 'playing',
    currentSuit: suit,
    pendingSuitSelection: null,
    showHand: false,
  };
}

// Advance to next turn
export function nextTurn(state: GameState): GameState {
  let nextIndex = getNextPlayerIndex(
    state.currentPlayerIndex,
    state.players.length,
    state.direction
  );

  const newPlayers = [...state.players];

  // Check if next player is skipped
  if (newPlayers[nextIndex].isSkipped) {
    newPlayers[nextIndex] = {
      ...newPlayers[nextIndex],
      isSkipped: false,
    };
    nextIndex = getNextPlayerIndex(nextIndex, state.players.length, state.direction);
  }

  // Reset last drawn card state
  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: nextIndex,
    lastDrawnCard: null,
    canPlayDrawnCard: false,
    showHand: false,
  };
}

// Say Mau
export function sayMau(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return state;
  }

  const player = state.players[playerIndex];
  
  // Can only say Mau when having exactly 2 cards (about to have 1)
  if (player.hand.length !== 2) {
    return state;
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hasSaidMau: true,
  };

  return {
    ...state,
    players: newPlayers,
  };
}

// Say Mau Mau
export function sayMauMau(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return state;
  }

  const player = state.players[playerIndex];
  
  // Can only say Mau Mau when having exactly 1 card
  if (player.hand.length !== 1) {
    return state;
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hasSaidMauMau: true,
  };

  return {
    ...state,
    players: newPlayers,
  };
}

// Check if player should have said Mau but didn't
export function checkMauViolation(state: GameState, playerId: string): boolean {
  if (!state.rules.mauSagen) return false;
  
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  
  // If player had 2 cards and now has 1, but didn't say Mau
  return player.hand.length === 1 && !player.hasSaidMau;
}

// Get penalty for not saying Mau
export function applyMauPenalty(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const penaltyCard = state.drawPile[0];

  if (!penaltyCard) return state;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...player,
    hand: [...player.hand, penaltyCard],
    hasSaidMau: false,
  };

  return {
    ...state,
    players: newPlayers,
    drawPile: state.drawPile.slice(1),
    announcements: [
      ...state.announcements,
      {
        id: generateId(),
        message: `${player.name} hat nicht "Mau" gesagt! Strafkarte gezogen!`,
        type: 'warning' as const,
      },
    ],
  };
}

// Toggle hand visibility
export function toggleHandVisibility(state: GameState): GameState {
  return {
    ...state,
    showHand: !state.showHand,
  };
}
