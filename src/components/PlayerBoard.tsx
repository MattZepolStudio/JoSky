import React from 'react';
import { Player, GamePhase, TurnAction } from '../types/game';
import { JoskyCard } from './JoskyCard';
import { gridAnchor } from '../utils/cardMoves';

interface PlayerBoardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isSelf: boolean;
  gamePhase: GamePhase;
  turnAction: TurnAction;
  mode?: 'full' | 'compact';
  tightRows?: boolean; // Short screens: leave more height to many opponents
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
  tightRows = false,
  onCardClick,
  discardAndFlipMode = false,
}) => {
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

  const getBackHint = (index: number): string | undefined => {
    const card = player.cards[index];
    if (!isSelf || !card || card.isRevealed) return undefined;
    if (gamePhase === 'initial_revealing' && player.initialRevealedCount < 2) return 'Toucher';
    if (gamePhase === 'playing' && isCurrentPlayer && discardAndFlipMode) return 'Retourner';
    return undefined;
  };

  return (
    <div
      className={`relative rounded-xl sm:rounded-2xl transition-all duration-300 w-full max-w-full sm:max-w-md mx-auto px-2 py-1 xs:py-1.5 ${
        isCurrentPlayer
          ? 'bg-gradient-to-b from-indigo-950/90 via-slate-900/90 to-slate-950/95 border-2 border-amber-400 shadow-xl shadow-amber-500/15'
          : isSelf
          ? 'bg-slate-900/80 border border-slate-800 shadow-md'
          : 'bg-slate-900/40 border border-slate-800/60'
      }`}
    >
      {/* Player Header bar */}
      <div className="flex items-center justify-between mb-1 pb-0.5 sm:mb-1.5 sm:pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <span className="text-sm xs:text-base sm:text-lg">{player.avatar}</span>
            {isCurrentPlayer && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`font-bold truncate text-[11px] xs:text-xs sm:text-sm ${isSelf ? 'text-cyan-300' : 'text-slate-100'}`}>
                {player.name} {isSelf && '(Vous)'}
              </span>
              {player.isHost && (
                <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                  Hôte
                </span>
              )}
              {player.isBot && (
                <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 rounded font-bold">
                  IA
                </span>
              )}
            </div>

            {isCurrentPlayer ? (
              <span className="text-[9px] xs:text-[10px] text-amber-400 font-bold animate-pulse">
                {isSelf ? "★ Votre tour !" : `Tour de ${player.name}...`}
              </span>
            ) : (
              <span className="text-[9px] xs:text-[10px] text-slate-400">
                {player.revealedCount}/12 révélées
              </span>
            )}
          </div>
        </div>

        {/* Scores & Badges */}
        <div className="flex items-center gap-2 text-right">
          <div className="flex flex-col items-end leading-tight">
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] xs:text-[10px] text-slate-400 font-medium">Manche:</span>
              <span className="text-[11px] xs:text-xs sm:text-sm font-extrabold text-white tabular-nums">
                {player.roundScore} pts
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[8px] xs:text-[9px] text-slate-500">Total:</span>
              <span className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-amber-400 tabular-nums">
                {player.totalScore} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3x4 Card Grid: as wide as possible while the 3 rows still fit the screen height */}
      <div
        className="w-full justify-items-stretch mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: mode === 'compact' ? '6px' : '8px',
          maxWidth: mode === 'compact' ? 'calc((100cqh - 72px) / 3 * 5 / 7 * 4 + 18px)' : `calc(4 * ${tightRows ? 'min(12dvh, 15dvh - 28px)' : '12dvh'} * 5 / 7 + 24px)`,
        }}
      >
        {player.cards.map((card, index) => {
          const selectable = isCardSelectable(index);

          return (
            <div key={index} data-card-anchor={gridAnchor(player.id, index)} className="w-full aspect-[5/7] flex items-stretch">
              <JoskyCard
                card={card}
                size={mode === 'compact' ? 'compact' : 'full'}
                isSelectable={selectable}
                onClick={isSelf && onCardClick ? () => onCardClick(index) : undefined}
                backHint={getBackHint(index)}
              />
            </div>
          );
        })}
      </div>

      {/* Column elimination helper tip (shown on larger viewports only) */}
      {mode === 'full' && (
        <div className="hidden sm:flex mt-2 text-center text-[10px] text-slate-400 items-center justify-center gap-1">
          <span className="text-amber-400">💡</span>
          <span>Astuce : 3 cartes identiques dans une colonne sont éliminées !</span>
        </div>
      )}
    </div>
  );
};

