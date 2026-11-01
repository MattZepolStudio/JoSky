import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Player, GamePhase, REACTION_EMOJIS, TurnAction } from '../types/game';
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
  onReact?: (emoji: string) => void;
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
  onReact,
  onCardClick,
  discardAndFlipMode = false,
}) => {
  const [isReacting, setIsReacting] = useState(false);

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

  // The grid only pulses when it is the single place to touch
  const needsAttention = isSelf && (
    (gamePhase === 'initial_revealing' && player.initialRevealedCount < 2) ||
    (isCurrentPlayer && (discardAndFlipMode || turnAction === 'discard_choice'))
  );

  return (
    <div
      data-player-anchor={player.id}
      data-attention={needsAttention || undefined}
      className={`relative rounded-xl sm:rounded-2xl transition-all duration-300 w-full max-w-full sm:max-w-md mx-auto px-2 py-1 ${
        isCurrentPlayer
          ? 'bg-black/25 border-2 border-amber-400 shadow-xl shadow-amber-500/15'
          : isSelf
          ? 'bg-black/20 border border-brass-300/20'
          : 'bg-black/15 border border-brass-300/15'
      }`}
    >
      {/* Player Header bar */}
      <div className="flex items-center justify-between mb-1 pb-0.5 sm:mb-1.5 sm:pb-1 border-b border-felt-800/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <span className="text-sm sm:text-lg">{player.avatar}</span>
            {isCurrentPlayer && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`font-bold truncate text-[11px] sm:text-sm ${isSelf ? 'text-brass-300' : 'text-felt-100'}`}>
                {player.name} {isSelf && '(Vous)'}
              </span>
              {player.isHost && (
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                  Hôte
                </span>
              )}
              {player.isBot && (
                <span className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 rounded font-bold">
                  IA
                </span>
              )}
            </div>

            {!player.isConnected ? (
              <span className="text-[11px] text-rose-300 font-bold">
                Hors ligne, tours joués automatiquement
              </span>
            ) : isCurrentPlayer ? (
              <span className="text-[11px] text-amber-400 font-bold">
                {isSelf ? "★ Votre tour !" : `Tour de ${player.name}...`}
              </span>
            ) : (
              <span className="text-[11px] text-felt-400">
                {player.revealedCount}/12 révélées
              </span>
            )}
          </div>
        </div>

        {/* Scores & Badges */}
        <div className="flex items-center gap-2 text-right">
          {onReact && (
            <button
              type="button"
              onClick={() => setIsReacting((open) => !open)}
              aria-label="Réagir"
              aria-expanded={isReacting}
              className="w-11 h-11 -my-2 flex items-center justify-center rounded-xl text-brass-200 cursor-pointer active:scale-90 transition"
            >
              <Smile className="w-4 h-4" />
            </button>
          )}
          <div className="flex flex-col items-end leading-tight">
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-felt-400 font-medium">Visibles :</span>
              <span className="text-[11px] sm:text-sm font-extrabold text-white tabular-nums">
                {player.roundScore} pts
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-felt-500">Total:</span>
              <span className="text-[11px] sm:text-xs font-bold text-amber-400 tabular-nums">
                {player.totalScore} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reactions float above the header so the grid never moves */}
      {onReact && isReacting && (
        <div className="absolute right-1 -top-9 z-30 flex gap-0.5 p-1 rounded-full bg-felt-950/95 border border-brass-300/30 shadow-xl animate-fade-in">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                setIsReacting(false);
              }}
              aria-label={`Réagir ${emoji}`}
              className="text-xl w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

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
            <div
              key={index}
              data-card-anchor={gridAnchor(player.id, index)}
              className={`w-full aspect-[5/7] flex items-stretch transition-opacity ${isSelf && isCurrentPlayer && discardAndFlipMode && !selectable ? 'opacity-35' : ''}`}
            >
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

    </div>
  );
};

