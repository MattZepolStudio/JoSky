import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';
import { ArrowRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-fade-in">
      <div className="table-plate w-full max-w-md max-h-full rounded-3xl px-5 py-6 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-4xl leading-none text-brass-200">
            Manche {gameState.roundNumber}
          </h2>
          <p className="text-sm text-felt-200 mt-3">
            {triggerPlayer ? `${triggerPlayer.name} a terminé en premier.` : 'Manche terminée.'}
            {gameState.targetScore > 1 && ` Fin à ${gameState.targetScore} points.`}
          </p>
        </div>

        {/* Player scores list */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-4">
          {sortedPlayers.map((player, rank) => {
            const isWinnerOfRound = rank === 0;

            return (
              <div
                key={player.id}
                style={{ animationDelay: `${rank * 90}ms` }}
                className={`animate-row-in p-3 rounded-2xl border ${
                  isWinnerOfRound ? 'bg-black/25 border-brass-300/70' : 'bg-black/20 border-brass-300/15'
                }`}
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-title text-xl w-5 text-center text-brass-200">
                    {rank + 1}
                  </span>
                  <span className="text-2xl">{player.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-sm ${isWinnerOfRound ? 'text-brass-200' : 'text-felt-100'}`}>
                        {player.name} {player.id === currentUserId && '(Vous)'}
                      </span>
                    </div>
                    <span className="text-xs text-felt-300">
                      Total : <strong className="text-brass-200 tabular-nums"><AnimatedScore value={player.totalScore} /> pts</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums flex items-center justify-end gap-1.5">
                    {gameState.doubledPlayerId === player.id && <DoubledBadge />}
                    <AnimatedScore value={player.roundScore} showPlus />
                  </div>
                  <span className="text-[11px] text-felt-300">
                    cette manche
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
            className="w-full py-3 px-4 rounded-2xl btn-primary font-black text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer flex-shrink-0"
          >
            <span>Lancer la Manche {gameState.roundNumber + 1}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="text-center text-sm text-felt-200 py-2.5 flex items-center justify-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-brass-300 animate-ping"></span>
            <span>En attente de l'hôte pour la manche suivante...</span>
          </div>
        )}
      </div>
    </div>
  );
};
