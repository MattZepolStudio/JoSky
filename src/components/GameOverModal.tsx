import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw } from 'lucide-react';
import { PlayerCardsReveal } from './PlayerCardsReveal';

interface GameOverModalProps {
  gameState: GameState;
  currentUserId: string;
  isHost: boolean;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  currentUserId,
  isHost,
  onRestart,
}) => {
  const sortedPlayers = [...gameState.players].sort((a, b) => a.totalScore - b.totalScore);
  const winner = sortedPlayers[0];

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
          Victoire éclatante de <strong className="text-amber-400 font-extrabold">{winner.name}</strong> !
        </p>

        {/* Podium rankings */}
        <div className="w-full flex-1 min-h-0 overflow-y-auto space-y-2.5 my-4">
          {sortedPlayers.map((player, idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[idx] || `#${idx + 1}`;
            const isWinner = idx === 0;

            return (
              <div
                key={player.id}
                className={`p-3 rounded-2xl border ${
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
                    <span className={`font-bold text-sm ${isWinner ? 'text-amber-300' : 'text-felt-200'}`}>
                      {player.name}
                    </span>
                    {player.isBot && (
                      <span className="text-[10px] text-rose-400 block">Bot IA</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-white tabular-nums">
                    {player.totalScore} pts
                  </div>
                  <span className="text-[10px] text-felt-400 uppercase font-semibold">
                    Score final
                  </span>
                </div>
                </div>

                <PlayerCardsReveal player={player} defaultOpen={player.id === currentUserId} />
              </div>
            );
          })}
        </div>

        {/* Play again button */}
        {isHost ? (
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-felt-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition transform active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Rejouer une partie</span>
          </button>
        ) : (
          <div className="text-center text-xs text-felt-400 py-2.5 bg-felt-950/60 rounded-xl border border-felt-800 w-full flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>En attente de l'hôte pour rejouer...</span>
          </div>
        )}
      </div>
    </div>
  );
};
