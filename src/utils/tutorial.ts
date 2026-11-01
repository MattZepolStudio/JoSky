import { GameState, Player } from '../types/game';

export type TutorialStep = 'reveal' | 'choose' | 'drawn' | 'keep' | 'taken' | 'flip' | 'goal';

export const TUTORIAL_TEXT: Record<TutorialStep, string> = {
  reveal: 'Bienvenue ! Le but : avoir le moins de points possible. Retournez 2 cartes de votre grille.',
  choose: 'À vous ! Touchez la pioche pour une carte inconnue, ou la défausse pour prendre la carte visible.',
  drawn: 'Petite carte ? Gardez-la. Grosse carte ? Jetez-la. Le but est d\'avoir le moins de points.',
  keep: 'Touchez la carte à remplacer. Elle partira à la défausse.',
  taken: 'Une carte prise dans la défausse se garde : touchez une carte de votre grille pour l\'échanger.',
  flip: 'En échange, retournez une de vos cartes cachées.',
  goal: 'Bien joué ! Astuce : 3 cartes identiques dans une colonne disparaissent. Retourner toutes ses cartes lance le dernier tour.',
};

// The step follows what the player can do right now
export function getTutorialStep(
  state: GameState | null,
  me: Player | undefined,
  isMyTurn: boolean,
  isFlipping: boolean,
  isKeeping: boolean = false
): TutorialStep | null {
  if (!state || !me) return null;

  if (state.phase === 'initial_revealing') {
    return me.initialRevealedCount < 2 ? 'reveal' : null;
  }
  if (state.phase !== 'playing') return null;

  if (!isMyTurn) return me.revealedCount > 2 ? 'goal' : null;
  if (isFlipping) return 'flip';
  if (isKeeping) return 'keep';
  if (state.turnAction === 'drawn_card_choice') return 'drawn';
  if (state.turnAction === 'discard_choice') return 'taken';
  return 'choose';
}
