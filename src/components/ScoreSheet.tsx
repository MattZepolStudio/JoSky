import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GameState } from '../types/game';

interface ScoreSheetProps {
  gameState: GameState;
  currentUserId: string;
  onClose: () => void;
}

const DANGER_RATIO = 0.8;

export const ScoreSheet: React.FC<ScoreSheetProps> = ({ gameState, currentUserId, onClose }) => {
  const { players, targetScore, roundNumber } = gameState;
  const isSingleRound = targetScore === 1;
  const ranked = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const scoreOf = (player: (typeof players)[number]) => (isSingleRound ? player.roundScore : player.totalScore);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Scores"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-full overflow-y-auto mx-auto bg-felt-900 border-t sm:border border-brass-300/25 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-sheet-up"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-2xl text-white leading-none">Scores</h2>
            <p className="text-sm text-brass-200 mt-1.5">
              Manche {roundNumber} · {isSingleRound ? 'manche unique' : `fin à ${targetScore} points`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les scores"
            className="p-2 -mt-1 rounded-xl text-felt-300 bg-black/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-brass-300/15">
          {ranked.map((player, index) => {
            const isMe = player.id === currentUserId;
            const ratio = Math.max(0, Math.min(player.totalScore / targetScore, 1));
            const remaining = targetScore - player.totalScore;

            return (
              <div key={player.id} className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center text-sm font-black text-felt-400">{index + 1}</span>
                  <span className="avatar w-9 h-9 text-lg flex-shrink-0">{player.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm truncate ${isMe ? 'text-brass-200' : 'text-white'}`}>
                      {player.name} {isMe && '(Vous)'}
                    </div>
                    <div className="text-xs text-felt-300">
                      {isSingleRound
                        ? 'Cette manche'
                        : `Cette manche : ${player.roundScore} · reste ${Math.max(0, remaining)} pts`}
                    </div>
                  </div>
                  <span className="text-xl font-black text-white tabular-nums">{scoreOf(player)}</span>
                </div>

                {!isSingleRound && (
                  <div className="ml-7 mt-1.5 h-1.5 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ratio >= DANGER_RATIO ? 'bg-rose-500' : 'bg-brass-300'}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
