import { SkyjoCard, Player } from '../types/game';

// Standard 150 cards in official Skyjo
export function generateSkyjoDeck(): SkyjoCard[] {
  const deck: SkyjoCard[] = [];
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

export function shuffleDeck(deck: SkyjoCard[]): SkyjoCard[] {
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
export function checkAndEliminateColumns(cards: (SkyjoCard | null)[]): {
  newCards: (SkyjoCard | null)[];
  eliminatedCards: SkyjoCard[];
  eliminatedColumns: number[];
} {
  const newCards = [...cards];
  const eliminatedCards: SkyjoCard[] = [];
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
export function calculatePlayerScore(cards: (SkyjoCard | null)[], onlyRevealed: boolean = false): number {
  return cards.reduce((sum, card) => {
    if (!card) return sum;
    if (onlyRevealed && !card.isRevealed) return sum;
    return sum + card.value;
  }, 0);
}

// Card appearance theme based on Skyjo colors
export function getCardTheme(value: number): {
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  glowColor: string;
} {
  if (value < 0) {
    // -2 and -1: Deep Indigo / Purple
    return {
      bgGradient: 'from-indigo-600 via-indigo-700 to-purple-900',
      borderColor: 'border-indigo-400',
      textColor: 'text-indigo-100',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
      glowColor: 'shadow-indigo-500/40',
    };
  } else if (value === 0) {
    // 0: Cyan / Sky Blue
    return {
      bgGradient: 'from-cyan-500 via-cyan-600 to-sky-800',
      borderColor: 'border-cyan-300',
      textColor: 'text-white',
      badgeBg: 'bg-cyan-950/80 text-cyan-200 border-cyan-400/40',
      glowColor: 'shadow-cyan-400/40',
    };
  } else if (value <= 4) {
    // 1 to 4: Vibrant Emerald / Green
    return {
      bgGradient: 'from-emerald-500 via-emerald-600 to-teal-800',
      borderColor: 'border-emerald-300',
      textColor: 'text-white',
      badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-400/40',
      glowColor: 'shadow-emerald-500/40',
    };
  } else if (value <= 8) {
    // 5 to 8: Warm Amber / Yellow
    return {
      bgGradient: 'from-amber-400 via-yellow-500 to-amber-700',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-950',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-400/40',
      glowColor: 'shadow-amber-400/40',
    };
  } else {
    // 9 to 12: High penalty Red / Crimson
    return {
      bgGradient: 'from-rose-500 via-red-600 to-rose-900',
      borderColor: 'border-rose-300',
      textColor: 'text-white',
      badgeBg: 'bg-rose-950/80 text-rose-200 border-rose-400/40',
      glowColor: 'shadow-rose-500/40',
    };
  }
}
