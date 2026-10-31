export interface JoskyCard {
  id: string;
  value: number; // -2 to 12
  isRevealed: boolean;
  isEliminated?: boolean;
}

export type PlayerColumn = (JoskyCard | null)[];

export type BotLevel = 'easy' | 'normal' | 'hard';

export interface Player {
  id: string;
  name: string;
  avatar: string; // Emoji avatar
  isHost: boolean;
  isBot?: boolean;
  botLevel?: BotLevel;
  replacedHuman?: boolean; // Human who left mid-game, a bot plays their seat
  cards: (JoskyCard | null)[]; // 12 cards (indices 0..11). Null if eliminated
  revealedCount: number;
  initialRevealedCount: number;
  roundScore: number;
  totalScore: number;
  hasFinishedRound: boolean;
  isConnected: boolean;
}

export type GamePhase = 
  | 'lobby'             // Waiting for players in room
  | 'initial_revealing' // Players must flip 2 cards
  | 'playing'           // Main game turn loop
  | 'round_ended'       // Current round scoring
  | 'game_over';        // Target score reached, winner declared

export type TurnAction = 
  | 'choose_source'     // Draw from Draw Pile or Take from Discard
  | 'drawn_card_choice' // Drew from Draw Pile: either exchange with a card OR discard and flip one face-down card
  | 'discard_choice';   // Took from Discard Pile: MUST exchange with a card

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  drawPileCount: number;
  discardPile: JoskyCard[];
  currentDrawnCard: JoskyCard | null; // Currently drawn card waiting for action
  turnAction: TurnAction;
  roundNumber: number;
  targetScore: number; // e.g. 100 points
  finalRoundTriggeredBy: string | null; // Player ID who revealed all cards first
  lastTurnPlayerIds: string[]; // Players who still need to take their final turn
  winnerId: string | null;
  historyLogs: string[];
  turnEndsInMs: number | null; // Time left before auto-play, null when no timer runs
}

export interface RoomSettings {
  targetScore: number; // 100, 60, or 1 (single round)
  maxPlayers: number;
}
