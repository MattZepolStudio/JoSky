import React, { useState } from 'react';
import { Player, GamePhase } from '../types/game';
import { SkyjoCard } from './SkyjoCard';
import { PlayerBoard } from './PlayerBoard';
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

  // Helper modal to zoom on any opponent's cards
  const renderModal = () => {
    if (!inspectedPlayer) return null;
    return (
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
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
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
    );
  };

  // 1 Opponent (1v1 against Bot or 2nd player): Ultra-compact, informative header bar freeing vertical space
  if (opponents.length === 1) {
    const opponent = opponents[0];
    const isTurn = activePlayer?.id === opponent.id;

    return (
      <>
        <div className="w-full max-w-[340px] xs:max-w-[360px] sm:max-w-[390px] mx-auto flex-shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setInspectedPlayer(opponent)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setInspectedPlayer(opponent);
              }
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm select-none ${
              isTurn
                ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border-amber-400/80 text-white shadow-amber-500/15 ring-1 ring-amber-400/50'
                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
            title="Toucher pour zoomer sur sa grille"
          >
            {/* Left: Avatar, Name, Turn Indicator, Scores */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <span className="text-xl sm:text-2xl leading-none">{opponent.avatar}</span>
                {isTurn && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <div className="flex flex-col min-w-0 leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                    {opponent.name}
                  </span>
                  {opponent.isBot && (
                    <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-bold border border-purple-500/30">
                      IA
                    </span>
                  )}
                  {isTurn && (
                    <span className="text-[9px] text-amber-400 font-extrabold animate-pulse">
                      Joue...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                  <span>Manche: <strong className="text-white tabular-nums">{opponent.roundScore} pts</strong></span>
                  <span>·</span>
                  <span>Total: <strong className="text-amber-400 tabular-nums">{opponent.totalScore} pts</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Mini 3x4 Grid preview with tap indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="p-1 rounded-lg bg-slate-950/80 border border-slate-800"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '2px',
                  width: '64px',
                }}
              >
                {opponent.cards.map((card, idx) => (
                  <div key={idx} className="w-full aspect-[5/7] flex items-stretch">
                    <SkyjoCard card={card} size="mini" />
                  </div>
                ))}
              </div>
              <Eye className="w-3.5 h-3.5 text-slate-500 hidden xs:block" />
            </div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  // 2 Opponents: 2-column balanced grid filling the table width
  if (opponents.length === 2) {
    return (
      <>
        <div className="w-full max-w-[340px] xs:max-w-[360px] sm:max-w-[390px] mx-auto flex-shrink-0 grid grid-cols-2 gap-2">
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
                className={`flex flex-col gap-1 p-2 rounded-xl border cursor-pointer select-none transition-all active:scale-98 ${
                  isTurn
                    ? 'bg-amber-950/60 border-amber-400 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400/60'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Toucher pour zoomer"
              >
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base leading-none">{opponent.avatar}</span>
                    <span className="font-bold text-xs truncate text-slate-100">{opponent.name}</span>
                    {opponent.isBot && <span className="text-[7px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">IA</span>}
                  </div>
                  <span className="text-xs text-amber-400 font-extrabold tabular-nums">{opponent.roundScore} pts</span>
                </div>
                <div className="grid grid-cols-4 gap-0.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
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
        {renderModal()}
      </>
    );
  }

  // 3+ Opponents: Smooth horizontal strip
  return (
    <>
      <div className="w-full max-w-[340px] xs:max-w-[360px] sm:max-w-[390px] mx-auto flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin no-scrollbar justify-start">
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
      {renderModal()}
    </>
  );
};
