import { BotLevel, GameState, Player, JoskyCard } from '../types/game.ts';

// Bots only read revealed cards, never the value of a hidden one.
const DECK_SUM = 760;
const DECK_SIZE = 150;
const DOUBLING_MARGIN = 5;

export type BotPlacement = { action: 'swap' | 'flip'; index: number };

function visibleCards(state: GameState): JoskyCard[] {
  const cards = [...state.discardPile];
  if (state.currentDrawnCard) cards.push(state.currentDrawnCard);
  state.players.forEach(p => p.cards.forEach(c => {
    if (c && c.isRevealed) cards.push(c);
  }));
  return cards;
}

// Average value of a card the bot cannot see. The hard bot counts the cards in play.
function expectedHiddenValue(state: GameState, level: BotLevel): number {
  if (level !== 'hard') return DECK_SUM / DECK_SIZE;
  const seen = visibleCards(state);
  const unseen = DECK_SIZE - seen.length;
  if (unseen <= 0) return DECK_SUM / DECK_SIZE;
  return (DECK_SUM - seen.reduce((sum, c) => sum + c.value, 0)) / unseen;
}

function hiddenIndices(bot: Player): number[] {
  return bot.cards.flatMap((c, idx) => (c && !c.isRevealed ? [idx] : []));
}

function estimatedScore(player: Player, expected: number): number {
  return player.cards.reduce((sum, c) => {
    if (!c) return sum;
    return sum + (c.isRevealed ? c.value : expected);
  }, 0);
}

function columnMates(bot: Player, index: number): (JoskyCard | null)[] {
  const col = index % 4;
  return [col, col + 4, col + 8].filter(i => i !== index).map(i => bot.cards[i]);
}

// Finishing the round without the lowest score doubles it, so the hard bot weighs that risk.
function finishRisk(state: GameState, bot: Player, finalScore: number, expected: number): number {
  const opponents = state.players.filter(p => p.id !== bot.id);
  const bestOpponent = Math.min(...opponents.map(p => estimatedScore(p, expected)));
  if (finalScore > 0 && finalScore >= bestOpponent) return finalScore + DOUBLING_MARGIN;
  return -DOUBLING_MARGIN;
}

function swapGain(state: GameState, bot: Player, index: number, value: number, level: BotLevel, expected: number): number {
  const old = bot.cards[index]!;
  const oldValue = old.isRevealed ? old.value : expected;
  let gain = oldValue - value;

  if (level !== 'easy') {
    const [a, b] = columnMates(bot, index);
    const revealedMates = [a, b].filter((c): c is JoskyCard => Boolean(c && c.isRevealed));

    if (revealedMates.length === 2 && revealedMates.every(c => c.value === value)) {
      gain += 3 * value;
    } else if (value > 0 && a && b && revealedMates.some(c => c.value === value)) {
      gain += value * 0.4;
    }

    if (old.isRevealed && old.value > 0 && revealedMates.some(c => c.value === old.value)) {
      gain -= old.value * 0.4;
    }
  }

  if (level === 'hard') {
    const hidden = hiddenIndices(bot);
    if (hidden.length === 1 && hidden[0] === index) {
      gain -= finishRisk(state, bot, estimatedScore(bot, expected) - oldValue + value, expected);
    }
  }

  return gain;
}

function bestSwap(state: GameState, bot: Player, value: number, level: BotLevel, rand: () => number) {
  const expected = expectedHiddenValue(state, level);
  let best = { index: -1, gain: -Infinity };

  bot.cards.forEach((card, index) => {
    if (!card) return;
    const noise = level === 'easy' ? (rand() - 0.5) * 8 : 0;
    const gain = swapGain(state, bot, index, value, level, expected) + noise;
    if (gain > best.gain) best = { index, gain };
  });

  return best;
}

export function chooseSource(state: GameState, bot: Player, level: BotLevel, rand: () => number = Math.random): 'draw' | 'discard' {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return 'draw';
  if (level === 'easy') return top.value <= 4 ? 'discard' : 'draw';
  return bestSwap(state, bot, top.value, level, rand).gain >= 3 ? 'discard' : 'draw';
}

export function choosePlacement(state: GameState, bot: Player, level: BotLevel, rand: () => number = Math.random): BotPlacement {
  const card = state.currentDrawnCard!;
  const swap = bestSwap(state, bot, card.value, level, rand);
  const hidden = hiddenIndices(bot);

  if (state.turnAction === 'discard_choice' || hidden.length === 0) {
    return { action: 'swap', index: swap.index };
  }

  const expected = expectedHiddenValue(state, level);
  const flipIndex = hidden[Math.floor(rand() * hidden.length)];
  let flipGain = 1;
  if (level === 'hard' && hidden.length === 1) {
    flipGain -= finishRisk(state, bot, estimatedScore(bot, expected), expected);
  }

  return swap.gain >= flipGain ? { action: 'swap', index: swap.index } : { action: 'flip', index: flipIndex };
}

export function chooseInitialReveal(bot: Player, rand: () => number = Math.random): number {
  const hidden = hiddenIndices(bot);
  return hidden[Math.floor(rand() * hidden.length)];
}
