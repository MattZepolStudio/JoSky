import { JoskyCard, Player } from '../types/game';

// Standard 150-card JoSky deck
export function generateDeck(): JoskyCard[] {
  const deck: JoskyCard[] = [];
  let idCounter = 1;

  // 5 x -2
  for (let i = 0; i < 5; i++) {
    deck.push({ id: `card-${idCounter++}`, value: -2, isRevealed: false });
  }

  // 10 x -1
  for (let i = 0; i < 10; i++) {
    deck.push({ id: `card-${idCounter++}`, value: -1, isRevealed: false });
  }

  // 15 x 0
  for (let i = 0; i < 15; i++) {
    deck.push({ id: `card-${idCounter++}`, value: 0, isRevealed: false });
  }

  // 10 each of 1 to 12
  for (let val = 1; val <= 12; val++) {
    for (let i = 0; i < 10; i++) {
      deck.push({ id: `card-${idCounter++}`, value: val, isRevealed: false });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: JoskyCard[]): JoskyCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Columns in a 3 rows x 4 cols grid
// Col 0: 0, 4, 8
// Col 1: 1, 5, 9
// Col 2: 2, 6, 10
// Col 3: 3, 7, 11
export function checkAndEliminateColumns(cards: (JoskyCard | null)[]): {
  newCards: (JoskyCard | null)[];
  eliminatedCards: JoskyCard[];
  eliminatedColumns: number[];
} {
  const newCards = [...cards];
  const eliminatedCards: JoskyCard[] = [];
  const eliminatedColumns: number[] = [];

  for (let col = 0; col < 4; col++) {
    const idx0 = col;
    const idx1 = col + 4;
    const idx2 = col + 8;

    const c0 = newCards[idx0];
    const c1 = newCards[idx1];
    const c2 = newCards[idx2];

    // If all 3 cards exist, are revealed, and have identical value
    if (
      c0 && c1 && c2 &&
      c0.isRevealed && c1.isRevealed && c2.isRevealed &&
      c0.value === c1.value && c1.value === c2.value
    ) {
      eliminatedCards.push({ ...c0, isEliminated: true }, { ...c1, isEliminated: true }, { ...c2, isEliminated: true });
      newCards[idx0] = null;
      newCards[idx1] = null;
      newCards[idx2] = null;
      eliminatedColumns.push(col);
    }
  }

  return { newCards, eliminatedCards, eliminatedColumns };
}

// Calculate sum of revealed cards (or all cards)
export function calculatePlayerScore(cards: (JoskyCard | null)[], onlyRevealed: boolean = false): number {
  return cards.reduce((sum, card) => {
    if (!card) return sum;
    if (onlyRevealed && !card.isRevealed) return sum;
    return sum + card.value;
  }, 0);
}

// One color and one shape per family, so a card never relies on color alone
export function getCardTheme(value: number): {
  background: string;
  borderColor: string;
  textColor: string;
  symbol: string;
} {
  if (value < 0) return { background: 'bg-[#4F46E5]', borderColor: 'border-indigo-300', textColor: 'text-white', symbol: '★' };
  if (value === 0) return { background: 'bg-[#0E7490]', borderColor: 'border-cyan-300', textColor: 'text-white', symbol: '◆' };
  if (value <= 4) return { background: 'bg-[#047857]', borderColor: 'border-emerald-300', textColor: 'text-white', symbol: '●' };
  if (value <= 8) return { background: 'bg-[#FBBF24]', borderColor: 'border-amber-100', textColor: 'text-[#3B2A0E]', symbol: '▲' };
  return { background: 'bg-[#BE123C]', borderColor: 'border-rose-300', textColor: 'text-white', symbol: '■' };
}
