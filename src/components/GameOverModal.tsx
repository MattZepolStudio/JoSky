import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw } from 'lucide-react';
import { PlayerCardsReveal } from './PlayerCardsReveal';
import { AnimatedScore, DoubledBadge } from './AnimatedScore';

interface GameOverModalProps {
  gameState: GameState;
  currentUserId: string;
  isHost: boolean;
  onRematch: () => void;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  currentUserId,
  isHost,
  onRematch,
  onRestart,
}) => {
  const sortedPlayers = [...gameState.players].sort((a, b) => a.totalScore - b.totalScore);
  const winners = sortedPlayers.filter(p => p.totalScore === sortedPlayers[0].totalScore);

  useEffect(() => {
    sound.winFanfare();

    // Trigger celebratory confetti burst
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

    (function frame() {
      try {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });
        }
      } catch {
        // confetti fallback
      }

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md max-h-full bg-felt-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Victory Trophy */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/40 animate-bounce">
            <Trophy className="w-10 h-10 text-amber-950" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Partie Terminée !
        </h2>
        <p className="text-sm text-felt-300 mt-1">
          {winners.length > 1 ? 'Égalité entre ' : 'Victoire éclatante de '}
          <strong className="text-brass-300 font-extrabold">{winners.map(p => p.name).join(' et ')}</strong> !
        </p>

        {/* Podium rankings */}
        <div className="w-full flex-1 min-h-0 overflow-y-auto space-y-2.5 my-4">
          {sortedPlayers.map((player, idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[idx] || `#${idx + 1}`;
            const isWinner = player.totalScore === winners[0].totalScore;

            return (
              <div
                key={player.id}
                style={{ animationDelay: `${idx * 90}ms` }}
                className={`animate-row-in p-3 rounded-2xl border ${
                  isWinner
                    ? 'bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-felt-950/50 border-felt-800'
                }`}
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-7 text-center">{medal}</span>
                  <span className="text-2xl">{player.avatar}</span>
                  <div className="text-left">
                    <span className={`font-bold text-sm ${isWinner ? 'text-brass-300' : 'text-felt-200'}`}>
                      {player.name}
                    </span>
                    {player.isBot && (
                      <span className="text-[11px] text-rose-400 block">Bot IA</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-white tabular-nums flex items-center justify-end gap-1.5">
                    {gameState.doubledPlayerId === player.id && <DoubledBadge />}
                    <span><AnimatedScore value={player.totalScore} /> pts</span>
                  </div>
                  <span className="text-[11px] text-felt-400 uppercase font-semibold">
                    Score final
                  </span>
                </div>
                </div>

                <PlayerCardsReveal player={player} defaultOpen={player.id === currentUserId} />
              </div>
            );
          })}
        </div>

        {/* Play again */}
        <button
          type="button"
          onClick={onRematch}
          className="btn-primary w-full py-3 px-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer flex-shrink-0"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Revanche</span>
        </button>
        {isHost && (
          <button
            type="button"
            onClick={onRestart}
            className="mt-2 text-xs font-semibold text-felt-300 underline cursor-pointer flex-shrink-0"
          >
            Retour au salon
          </button>
        )}
      </div>
    </div>
  );
};
