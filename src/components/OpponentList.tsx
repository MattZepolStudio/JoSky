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
      <div className="w-full flex-shrink-0">
        {/* Compact horizontal scroll strip for opponents */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex-shrink-0 hidden xs:inline pl-0.5">
            Adversaires :
          </span>
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
                className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-xl border cursor-pointer select-none transition-all active:scale-95 ${
                  isTurn
                    ? 'bg-amber-950/70 border-amber-400 text-white shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Toucher pour inspecter la grille complète"
              >
                <span className="text-base leading-none">{opponent.avatar}</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[11px] truncate max-w-[65px] xs:max-w-[85px] sm:max-w-none text-slate-100">
                      {opponent.name}
                    </span>
                    {opponent.isBot && (
                      <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">
                        IA
                      </span>
                    )}
                    {isTurn && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className="text-white font-extrabold tabular-nums">
                      {opponent.roundScore} pts
                    </span>
                    <span>·</span>
                    <span>{opponent.revealedCount}/12</span>
                  </div>
                </div>
                <Eye className="w-3 h-3 text-slate-400 ml-0.5 flex-shrink-0 opacity-70" />
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
