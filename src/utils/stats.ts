import { GameState } from '../types/game';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  bestScore: number | null; // Lowest final score
}

const STATS_KEY = 'josky_stats';
const LAST_GAME_KEY = 'josky_stats_last_game';

export function loadStats(): PlayerStats {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (saved && typeof saved.gamesPlayed === 'number') return saved;
  } catch {}
  return { gamesPlayed: 0, wins: 0, bestScore: null };
}

// Called every time a game_over state arrives, so each game must only count once
export function recordFinishedGame(state: GameState, playerId: string) {
  const me = state.players.find(p => p.id === playerId);
  if (!me) return;

  const gameKey = `${state.roomCode}-${state.roundNumber}-${state.players.map(p => p.totalScore).join('_')}`;
  try {
    if (localStorage.getItem(LAST_GAME_KEY) === gameKey) return;
    localStorage.setItem(LAST_GAME_KEY, gameKey);

    const stats = loadStats();
    localStorage.setItem(STATS_KEY, JSON.stringify({
      gamesPlayed: stats.gamesPlayed + 1,
      wins: stats.wins + (me.totalScore === Math.min(...state.players.map(p => p.totalScore)) ? 1 : 0),
      bestScore: stats.bestScore === null ? me.totalScore : Math.min(stats.bestScore, me.totalScore),
    }));
  } catch {}
}
