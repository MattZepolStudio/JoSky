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
      className={`relative rounded-xl sm:rounded-2xl transition-all duration-300 w-fit mx-auto max-w-full ${
        isCurrentPlayer
          ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900/90 border-2 border-amber-400/90 shadow-lg shadow-amber-500/10'
          : isSelf
          ? 'bg-slate-900/70 border border-slate-800'
          : 'bg-slate-900/40 border border-slate-800/60'
      } ${mode === 'compact' ? 'p-1.5' : 'p-2 xs:p-2.5 sm:p-3.5'}`}
    >
      {/* Player Header bar */}
      <div className="flex items-center justify-between mb-1.5 pb-1 sm:mb-2 sm:pb-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <span className="text-lg xs:text-xl sm:text-2xl">{player.avatar}</span>
            {isCurrentPlayer && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`font-bold truncate text-xs sm:text-sm ${isSelf ? 'text-cyan-300' : 'text-slate-100'}`}>
                {player.name} {isSelf && '(Vous)'}
              </span>
              {player.isHost && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                  Hôte
                </span>
              )}
              {player.isBot && (
                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 rounded font-bold">
                  IA
                </span>
              )}
            </div>

            {isCurrentPlayer ? (
              <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                {isSelf ? "★ Votre tour !" : `Tour de ${player.name}...`}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">
                {player.revealedCount}/12 révélées
              </span>
            )}
          </div>
        </div>

        {/* Scores & Badges */}
        <div className="flex items-center gap-2 text-right">
          <div className="flex flex-col items-end leading-tight">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Manche:</span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums">
                {player.roundScore} pts
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] sm:text-[10px] text-slate-500">Total:</span>
              <span className="text-[10px] sm:text-xs font-bold text-amber-400 tabular-nums">
                {player.totalScore} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid columns Header Hints (only show if any combo hint exists) */}
      {mode === 'full' && [0, 1, 2, 3].some((col) => getColumnHint(col)) && (
        <div className="grid grid-cols-4 gap-1.5 xs:gap-2 mb-1 px-0.5">
          {[0, 1, 2, 3].map((col) => {
            const hint = getColumnHint(col);
            return (
              <div key={col} className="text-center">
                {hint ? (
                  <span className="text-[8px] xs:text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/40 inline-block truncate max-w-full">
                    {hint}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* 3x4 Card Grid: Tightly compacted and cohesive */}
      <div className="grid grid-cols-4 gap-1.5 xs:gap-2 justify-items-center">
        {player.cards.map((card, index) => {
          const selectable = isCardSelectable(index);

          return (
            <div key={index} className="flex justify-center">
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

      {/* Column elimination helper tip (shown on larger viewports) */}
      {mode === 'full' && (
        <div className="hidden sm:flex mt-2 text-center text-[10px] text-slate-400 items-center justify-center gap-1">
          <span className="text-amber-400">💡</span>
          <span>Astuce : 3 cartes identiques dans une colonne sont éliminées !</span>
        </div>
      )}
    </div>
  );
};
