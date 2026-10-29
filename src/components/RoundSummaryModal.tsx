import React, { useEffect } from 'react';
import { Player, GameState } from '../types/game';
import { sound } from '../utils/audio';
import { ArrowRight, Trophy, AlertCircle } from 'lucide-react';

interface RoundSummaryModalProps {
  gameState: GameState;
  isHost: boolean;
  onNextRound: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  gameState,
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <span className="text-3xl">🏁</span>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">
            Fin de la Manche {gameState.roundNumber}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Objectif de fin : {gameState.targetScore} points
          </p>
        </div>

        {/* Trigger player notice & doubling rule notification */}
        {triggerPlayer && (
          <div className="mb-4 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-center">
            <span className="text-slate-400">Terminé en premier par : </span>
            <strong className="text-indigo-300 font-bold">{triggerPlayer.name}</strong>
          </div>
        )}

        {/* Player scores list */}
        <div className="space-y-2 mb-5">
          {sortedPlayers.map((player, rank) => {
            const isWinnerOfRound = rank === 0;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isWinnerOfRound
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-black text-slate-500 w-5">
                    #{rank + 1}
                  </span>
                  <span className="text-2xl">{player.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">
                        {player.name}
                      </span>
                      {isWinnerOfRound && (
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Total : <strong className="text-amber-400 tabular-nums">{player.totalScore} pts</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    +{player.roundScore}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Cette manche
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            type="button"
            onClick={onNextRound}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-98 cursor-pointer"
          >
            <span>Lancer la Manche {gameState.roundNumber + 1}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="text-center text-xs text-slate-400 py-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>En attente de l'hôte pour la manche suivante...</span>
          </div>
        )}
      </div>
    </div>
  );
};
