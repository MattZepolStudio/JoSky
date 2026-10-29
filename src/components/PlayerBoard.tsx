import React from 'react';
import { Player, GamePhase, TurnAction } from '../types/game';
import { SkyjoCard } from './SkyjoCard';

interface PlayerBoardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isSelf: boolean;
  gamePhase: GamePhase;
  turnAction: TurnAction;
  mode?: 'full' | 'compact';
  onCardClick?: (cardIndex: number) => void;
  discardAndFlipMode?: boolean;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  player,
  isCurrentPlayer,
  isSelf,
  gamePhase,
  turnAction,
  mode = 'full',
  onCardClick,
  discardAndFlipMode = false,
}) => {
  // Check column alignment for hints (e.g., column has 2 identical cards)
  const getColumnHint = (colIndex: number): string | null => {
    const c0 = player.cards[colIndex];
    const c1 = player.cards[colIndex + 4];
    const c2 = player.cards[colIndex + 8];

    // If 2 cards match and are revealed, it's a potential combo!
    const revealed = [c0, c1, c2].filter((c): c is NonNullable<typeof c> => c !== null && c.isRevealed);
    if (revealed.length === 2 && revealed[0].value === revealed[1].value) {
      return `Combo: ${revealed[0].value}!`;
    }
    return null;
  };

  const isCardSelectable = (index: number): boolean => {
    if (!isSelf) return false;
    const card = player.cards[index];
    if (!card) return false; // column eliminated

    if (gamePhase === 'initial_revealing') {
      return player.initialRevealedCount < 2 && !card.isRevealed;
    }

    if (gamePhase === 'playing' && isCurrentPlayer) {
      if (discardAndFlipMode) {
        // Can only flip an unrevealed card
        return !card.isRevealed;
      }
      if (turnAction === 'drawn_card_choice' || turnAction === 'discard_choice') {
        // Can replace any remaining card in grid
        return true;
      }
    }

    return false;
  };

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 ${
        isCurrentPlayer
          ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900/90 border-2 border-amber-400/90 shadow-xl shadow-amber-500/10'
          : isSelf
          ? 'bg-slate-900/70 border border-slate-800'
          : 'bg-slate-900/40 border border-slate-800/60'
      } ${mode === 'compact' ? 'p-2' : 'p-3 sm:p-4'}`}
    >
      {/* Player Header bar */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <span className="text-xl sm:text-2xl">{player.avatar}</span>
            {isCurrentPlayer && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-bold truncate text-sm sm:text-base ${isSelf ? 'text-cyan-300' : 'text-slate-100'}`}>
                {player.name} {isSelf && '(Vous)'}
              </span>
              {player.isHost && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-md font-bold">
                  Hôte
                </span>
              )}
              {player.isBot && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded-md font-bold">
                  IA
                </span>
              )}
            </div>

            {isCurrentPlayer ? (
              <span className="text-[11px] text-amber-400 font-semibold animate-pulse">
                {isSelf ? "C'est votre tour !" : `Tour de ${player.name}...`}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                {player.revealedCount}/12 révélées
              </span>
            )}
          </div>
        </div>

        {/* Scores & Badges */}
        <div className="flex items-center gap-2 text-right">
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-400 font-medium">Manche:</span>
              <span className="text-sm sm:text-base font-extrabold text-white tabular-nums">
                {player.roundScore} pts
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-slate-500">Total:</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 tabular-nums">
                {player.totalScore} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid columns Header Hints */}
      {mode === 'full' && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-1 px-0.5">
          {[0, 1, 2, 3].map((col) => {
            const hint = getColumnHint(col);
            return (
              <div key={col} className="text-center">
                {hint ? (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/40 inline-block truncate max-w-full">
                    {hint}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                    Col {col + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3x4 Card Grid (Row 0: 0,1,2,3; Row 1: 4,5,6,7; Row 2: 8,9,10,11) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 justify-items-center">
        {player.cards.map((card, index) => {
          const selectable = isCardSelectable(index);

          return (
            <div key={index} className="flex justify-center w-full">
              <SkyjoCard
                card={card}
                size={mode === 'compact' ? 'sm' : 'md'}
                isSelectable={selectable}
                onClick={() => onCardClick && onCardClick(index)}
                showBackHint={
                  isSelf &&
                  gamePhase === 'initial_revealing' &&
                  player.initialRevealedCount < 2 &&
                  Boolean(card && !card.isRevealed)
                }
              />
            </div>
          );
        })}
      </div>

      {/* Column elimination helper tip */}
      {mode === 'full' && (
        <div className="mt-2.5 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <span className="text-amber-400">💡</span>
          <span>Astuce : 3 cartes identiques dans une colonne sont éliminées !</span>
        </div>
      )}
    </div>
  );
};
