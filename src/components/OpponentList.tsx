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
        {/* Opponents strip with visible 3x4 mini grid */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin no-scrollbar justify-center">
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
                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all active:scale-98 ${
                  isTurn
                    ? 'bg-amber-950/60 border-amber-400 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400/60'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Toucher pour zoomer sur sa grille"
              >
                {/* Opponent Info Column */}
                <div className="flex flex-col items-center justify-center min-w-[50px] leading-tight">
                  <span className="text-lg leading-none">{opponent.avatar}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="font-bold text-[10px] truncate max-w-[55px] text-slate-200">
                      {opponent.name}
                    </span>
                    {opponent.isBot && (
                      <span className="text-[7px] bg-purple-500/20 text-purple-300 px-0.5 rounded font-bold">
                        IA
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-amber-400 font-black tabular-nums mt-0.5">
                    {opponent.roundScore} pts
                  </span>
                  {isTurn && (
                    <span className="text-[8px] text-amber-300 font-extrabold flex items-center gap-0.5 animate-pulse mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Joue
                    </span>
                  )}
                </div>

                {/* Opponent's 3x4 Mini Grid (Visible in real-time) */}
                <div className="grid grid-cols-4 gap-0.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                  {opponent.cards.map((card, idx) => (
                    <div key={idx} className="flex justify-center">
                      <SkyjoCard card={card} size="mini" />
                    </div>
                  ))}
                </div>
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
