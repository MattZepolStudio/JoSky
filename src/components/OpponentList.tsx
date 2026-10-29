import React, { useState } from 'react';
import { Player, GamePhase } from '../types/game';
import { SkyjoCard } from './SkyjoCard';
import { Eye, X } from 'lucide-react';

interface OpponentListProps {
  opponents: Player[];
  currentPlayerIndex: number;
  allPlayers: Player[];
  gamePhase: GamePhase;
}

export const OpponentList: React.FC<OpponentListProps> = ({
  opponents,
  currentPlayerIndex,
  allPlayers,
  gamePhase,
}) => {
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  if (opponents.length === 0) {
    return null;
  }

  const activePlayer = allPlayers[currentPlayerIndex];

  return (
    <>
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Adversaires ({opponents.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Touchez un joueur pour inspecter
          </span>
        </div>

        {/* Horizontal scroll list for mobile / flex grid for tablet & desktop */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin no-scrollbar">
          {opponents.map((opponent) => {
            const isTurn = activePlayer?.id === opponent.id;

            return (
              <div
                key={opponent.id}
                role="button"
                tabIndex={0}
                onClick={() => setInspectedPlayer(opponent)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setInspectedPlayer(opponent);
                  }
                }}
                className={`flex-shrink-0 text-left rounded-xl p-2.5 transition-all duration-200 border cursor-pointer select-none ${
                  isTurn
                    ? 'bg-amber-950/40 border-amber-400/80 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                } w-44 sm:w-52`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-lg">{opponent.avatar}</span>
                    <span className="font-bold text-xs truncate text-slate-200">
                      {opponent.name}
                    </span>
                    {opponent.isBot && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-bold">
                        IA
                      </span>
                    )}
                  </div>
                  <Eye className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                </div>

                {/* Score and turn indication */}
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-slate-400">
                    Manche :{' '}
                    <strong className="text-white font-extrabold tabular-nums">
                      {opponent.roundScore}
                    </strong>
                  </span>
                  <span className="text-amber-400 font-semibold tabular-nums">
                    Tot: {opponent.totalScore}
                  </span>
                </div>

                {/* Mini 3x4 Grid */}
                <div className="grid grid-cols-4 gap-1">
                  {opponent.cards.map((card, idx) => (
                    <div key={idx} className="flex justify-center">
                      <SkyjoCard card={card} size="mini" />
                    </div>
                  ))}
                </div>

                {isTurn && (
                  <div className="mt-1.5 text-center">
                    <span className="text-[10px] text-amber-300 font-bold animate-pulse inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      En train de jouer...
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect Modal to view full opponent grid */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{inspectedPlayer.avatar}</span>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {inspectedPlayer.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {inspectedPlayer.revealedCount} cartes révélées · {inspectedPlayer.roundScore} pts actuels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPlayer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detailed 3x4 Grid */}
            <div className="grid grid-cols-4 gap-2 mb-3 justify-items-center">
              {inspectedPlayer.cards.map((card, idx) => (
                <div key={idx} className="flex justify-center">
                  <SkyjoCard card={card} size="sm" />
                </div>
              ))}
            </div>

            {/* Total score footer */}
            <div className="bg-slate-950/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Score global :</span>
              <span className="font-bold text-amber-400 text-sm tabular-nums">
                {inspectedPlayer.totalScore} points
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
