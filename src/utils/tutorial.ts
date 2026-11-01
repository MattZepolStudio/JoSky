import { GameState, Player } from '../types/game';

export type TutorialStep = 'reveal' | 'choose' | 'drawn' | 'taken' | 'flip' | 'goal';

export const TUTORIAL_TEXT: Record<TutorialStep, string> = {
  reveal: 'Le moins de points gagne ! Retournez 2 cartes.',
  choose: 'Touchez la pioche ou la défausse.',
  drawn: 'Touchez la carte à remplacer, ou jetez celle-ci.',
  taken: 'Touchez la carte à remplacer.',
  flip: 'Retournez une carte cachée.',
  goal: '3 cartes identiques en colonne disparaissent !',
};

export const NEGATIVE_TIP = 'Les cartes négatives enlèvent des points : gardez-les !';
export const DOUBLING_TIP = 'Attention : finir sans le score le plus bas double vos points !';

// A negative card the player could take right now
export function hasNegativeOffer(state: GameState, isMyTurn: boolean): boolean {
  if (!isMyTurn || state.phase !== 'playing') return false;
  const top = state.discardPile[state.discardPile.length - 1];
  return (state.currentDrawnCard?.value ?? 0) < 0 || (top?.value ?? 0) < 0;
}

const visibleScore = (player: Player) => player.cards.reduce((sum, card) => sum + (card?.isRevealed ? card.value : 0), 0);

// One hidden card left: the next flip ends the round, and the player does not look ahead
export function isDoublingRisk(state: GameState, me: Player, isMyTurn: boolean): boolean {
  if (!isMyTurn || state.phase !== 'playing' || state.finalRoundTriggeredBy) return false;
  if (me.cards.filter(card => card && !card.isRevealed).length !== 1) return false;

  const myScore = visibleScore(me);
  const best = Math.min(...state.players.filter(p => p.id !== me.id).map(visibleScore));
  return myScore > 0 && myScore >= best;
}

// The step follows what the player can do right now
export function getTutorialStep(
  state: GameState | null,
  me: Player | undefined,
  isMyTurn: boolean,
  isFlipping: boolean
): TutorialStep | null {
  if (!state || !me) return null;

  if (state.phase === 'initial_revealing') {
    return me.initialRevealedCount < 2 ? 'reveal' : null;
  }
  if (state.phase !== 'playing') return null;

  if (!isMyTurn) return me.revealedCount > 2 ? 'goal' : null;
  if (isFlipping) return 'flip';
  if (state.turnAction === 'drawn_card_choice') return 'drawn';
  if (state.turnAction === 'discard_choice') return 'taken';
  return 'choose';
}
