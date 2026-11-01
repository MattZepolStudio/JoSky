import React, { useEffect } from 'react';
import { Avatar } from './Avatar';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';
import { ArrowRight, Trophy } from 'lucide-react';
import { PlayerCardsReveal } from './PlayerCardsReveal';
import { AnimatedScore, DoubledBadge } from './AnimatedScore';

interface RoundSummaryModalProps {
  gameState: GameState;
  currentUserId: string;
  isHost: boolean;
  onNextRound: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  gameState,
  currentUserId,
  isHost,
  onNextRound,
}) => {
  useEffect(() => {
    sound.yourTurn();
  }, []);

  const sortedPlayers = [...gameState.players].sort((a, b) => a.roundScore - b.roundScore);
  const triggerPlayer = gameState.players.find(p => p.id === gameState.finalRoundTriggeredBy);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md max-h-full bg-felt-900 border border-felt-700 rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <span className="text-3xl">🏁</span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Fin de la Manche {gameState.roundNumber}
          </h2>
          <p className="text-xs text-felt-400 mt-0.5">
            Objectif de fin : {gameState.targetScore} points
          </p>
        </div>

        {/* Trigger player notice & doubling rule notification */}
        {triggerPlayer && (
          <div className="mb-4 p-2.5 rounded-xl bg-felt-950/70 border border-felt-800 text-xs text-center">
            <span className="text-felt-400">Terminé en premier par : </span>
            <strong className="text-brass-300 font-bold">{triggerPlayer.name}</strong>
          </div>
        )}

        {/* Player scores list */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-4">
          {sortedPlayers.map((player, rank) => {
            const isWinnerOfRound = rank === 0;

            return (
              <div
                key={player.id}
                style={{ animationDelay: `${rank * 90}ms` }}
                className={`animate-row-in p-3 rounded-2xl border ${
                  isWinnerOfRound
                    ? 'bg-brass-950/40 border-brass-500/60 shadow-md'
                    : 'bg-felt-950/50 border-felt-800'
                }`}
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-black text-felt-500 w-5">
                    #{rank + 1}
                  </span>
                  <span className="text-2xl"><Avatar value={player.avatar} /></span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">
                        {player.name}
                      </span>
                      {isWinnerOfRound && (
                        <Trophy className="w-3.5 h-3.5 text-brass-300" />
                      )}
                    </div>
                    <span className="text-xs text-felt-400">
                      Total : <strong className="text-brass-300 tabular-nums"><AnimatedScore value={player.totalScore} /> pts</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums flex items-center justify-end gap-1.5">
                    {gameState.doubledPlayerId === player.id && <DoubledBadge />}
                    <AnimatedScore value={player.roundScore} showPlus />
                  </div>
                  <span className="text-[11px] text-felt-500 uppercase font-semibold">
                    Cette manche
                  </span>
                </div>
                </div>

                <PlayerCardsReveal player={player} defaultOpen={player.id === currentUserId} />
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            type="button"
            onClick={onNextRound}
            className="w-full py-3 px-4 rounded-2xl btn-primary font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
          >
            <span>Lancer la Manche {gameState.roundNumber + 1}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="text-center text-xs text-felt-400 py-2.5 bg-felt-950/60 rounded-xl border border-felt-800 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>En attente de l'hôte pour la manche suivante...</span>
          </div>
        )}
      </div>
    </div>
  );
};
