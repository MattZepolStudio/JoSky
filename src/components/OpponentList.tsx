import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Player, GamePhase } from '../types/game';
import { JoskyCard } from './JoskyCard';
import { PlayerBoard } from './PlayerBoard';
import { gridAnchor } from '../utils/cardMoves';
import { Eye, WifiOff, X } from 'lucide-react';

interface OpponentListProps {
  opponents: Player[];
  currentPlayerIndex: number;
  allPlayers: Player[];
  gamePhase: GamePhase;
  targetScore: number;
}

export const OpponentList: React.FC<OpponentListProps> = ({
  opponents,
  currentPlayerIndex,
  allPlayers,
  gamePhase,
  targetScore,
}) => {
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  if (opponents.length === 0) {
    return null;
  }

  const activePlayer = allPlayers[currentPlayerIndex];

  // Helper modal to zoom on any opponent's cards
  const renderModal = () => {
    if (!inspectedPlayer) return null;
    // Portal: the opponents area is a size container, which would trap a fixed element
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-sm bg-felt-900 border border-felt-700 rounded-2xl p-4 shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-felt-800">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{inspectedPlayer.avatar}</span>
              <div>
                <h3 className="font-bold text-base text-white">
                  {inspectedPlayer.name}
                </h3>
                <p className="text-xs text-felt-400">
                  {inspectedPlayer.revealedCount} cartes révélées · {inspectedPlayer.roundScore} points visibles
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedPlayer(null)}
              className="p-1 rounded-lg text-felt-400 hover:text-white bg-felt-800/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Detailed 3x4 Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3 justify-items-center">
            {inspectedPlayer.cards.map((card, idx) => (
              <div key={idx} className="flex justify-center">
                <JoskyCard card={card} size="sm" />
              </div>
            ))}
          </div>

          {/* Total score footer */}
          <div className="bg-felt-950/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="text-felt-400">Score global :</span>
            <span className="font-bold text-brass-300 text-sm tabular-nums">
              {inspectedPlayer.totalScore} points
            </span>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // 1 Opponent (1v1 against Bot or 2nd player): Clearly visible, balanced 3x4 grid
  if (opponents.length === 1) {
    const opponent = opponents[0];
    const isTurn = activePlayer?.id === opponent.id;

    return (
      <div className="w-full flex justify-center flex-shrink min-h-0">
        <PlayerBoard
          player={opponent}
          isCurrentPlayer={isTurn}
          isSelf={false}
          gamePhase={gamePhase}
          turnAction="choose_source"
          mode="compact"
        />
      </div>
    );
  }

  // 3 or 4 Opponents make a square, more use 4 columns. Cards then fill the free height
  const isSquare = opponents.length <= 4;
  const layout = {
    '--opponent-cols': isSquare ? 2 : 3,
    '--opponent-rows': opponents.length === 2 ? 1 : 2,
  } as React.CSSProperties;

  return (
    <>
      <div
        style={layout}
        className={`opponents-grid ${opponents.length === 2 ? 'opponents-grid-pair' : ''} w-full max-w-full sm:max-w-md m-auto grid gap-1 px-1`}
      >
        {opponents.map((opponent, index) => {
          const isTurn = activePlayer?.id === opponent.id;
          const isCenteredLast = opponents.length === 3 && index === 2;
          const isWaiting = !isTurn && gamePhase === 'playing' && opponents.some(p => p.id === activePlayer?.id);

          return (
            <div
              key={opponent.id}
              data-player-anchor={opponent.id}
              role="button"
              tabIndex={0}
              onClick={() => setInspectedPlayer(opponent)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setInspectedPlayer(opponent);
                }
              }}
              className={`min-w-0 flex flex-col gap-0.5 p-1 rounded-lg border cursor-pointer select-none transition-all active:scale-98 ${
                isCenteredLast ? 'col-span-2 justify-self-center w-[calc(50%-2px)]' : ''
              } ${isWaiting ? 'opacity-60' : ''} ${
                isTurn
                  ? 'bg-black/30 border-amber-400 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400/60'
                  : 'bg-black/20 border-brass-300/15 text-felt-300'
              }`}
              title="Toucher pour zoomer sur sa grille"
            >
              <div className="flex items-center gap-0.5 min-w-0 leading-none">
                {opponent.isConnected ? (
                  <span className="text-sm flex-shrink-0">{opponent.avatar}</span>
                ) : (
                  <WifiOff aria-label="Hors ligne" className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
                )}
                <span className={`font-bold text-[11px] truncate flex-1 min-w-0 ${opponent.isConnected ? 'text-felt-100' : 'text-rose-300'}`}>
                  {opponent.isConnected || !isSquare ? opponent.name : `${opponent.name} (hors ligne)`}
                </span>
                {/* Short screens only keep the visible points */}
                <span className="tile-score-compact text-[11px] text-brass-300 font-black tabular-nums flex-shrink-0">{opponent.roundScore}</span>
              </div>
              <div className="tile-stats text-[11px] leading-none text-felt-300 truncate">
                <strong className="text-brass-300 tabular-nums">{opponent.roundScore}</strong> vis.
                {targetScore > 1 && (
                  <> · total <strong className="text-felt-100 tabular-nums">{opponent.totalScore}</strong></>
                )}
              </div>

              {/* Opponent's 3x4 Mini Grid (Visible in real-time) */}
              <div className="grid grid-cols-4 gap-0.5 justify-items-center">
                {opponent.cards.map((card, idx) => (
                  <div key={idx} data-card-anchor={gridAnchor(opponent.id, idx)}>
                    <JoskyCard card={card} size="tile" />
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
};
