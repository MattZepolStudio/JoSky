import React, { useEffect } from 'react';
import { GameState } from '../types/game';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RotateCcw } from 'lucide-react';
import { PlayerCardsReveal } from './PlayerCardsReveal';
import { AnimatedScore, DoubledBadge } from './AnimatedScore';

// Each letter lands with its own spin and stays slightly crooked
const LOST_LETTERS = [
  { letter: 'P', spin: -24, tilt: -4, delay: 0 },
  { letter: 'e', spin: 30, tilt: 3, delay: 130 },
  { letter: 'r', spin: -38, tilt: -9, delay: 260 },
  { letter: 'd', spin: 20, tilt: 4, delay: 390 },
  { letter: 'u', spin: -30, tilt: 17, delay: 520 },
  { letter: '.', spin: 60, tilt: 0, delay: 820 },
  { letter: '.', spin: -60, tilt: 0, delay: 920 },
  { letter: '.', spin: 60, tilt: 0, delay: 1020 },
];

interface GameOverModalProps {
  gameState: GameState;
  currentUserId: string;
  isHost: boolean;
  onRematch: () => void;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  currentUserId,
  isHost,
  onRematch,
  onRestart,
}) => {
  const sortedPlayers = [...gameState.players].sort((a, b) => a.totalScore - b.totalScore);
  const winners = sortedPlayers.filter(p => p.totalScore === sortedPlayers[0].totalScore);
  const winnerNames = winners.map(p => p.name).join(' et ');
  const me = sortedPlayers.find(p => p.id === currentUserId);
  const myRank = me ? sortedPlayers.filter(p => p.totalScore < me.totalScore).length + 1 : 0;
  const hasWon = myRank === 1;

  const title = hasWon ? (winners.length > 1 ? 'Égalité !' : 'Victoire !') : 'Perdu…';
  const summary = hasWon
    ? (winners.length > 1 ? `À égalité avec ${winners.filter(p => p.id !== currentUserId).map(p => p.name).join(' et ')}.` : `Vous gagnez avec ${me?.totalScore} points.`)
    : `${winnerNames} ${winners.length > 1 ? 'gagnent' : 'gagne'}. Vous finissez ${myRank}e sur ${sortedPlayers.length}.`;

  useEffect(() => {
    if (!hasWon) {
      sound.loseSting();
      return;
    }

    sound.winFanfare();

    // Trigger celebratory confetti burst
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#e9c46f', '#f3dba0', '#f4f0e4', '#d8a93f'];

    (function frame() {
      try {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });
        }
      } catch {
        // confetti fallback
      }

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-fade-in">
      <div className={`table-plate ${hasWon ? '' : 'table-plate-lost'} w-full max-w-md max-h-full rounded-3xl px-5 py-6 flex flex-col items-center text-center`}>
        <h2 aria-label={title} className={`text-5xl leading-none ${hasWon ? 'text-brass-200' : 'text-felt-300'}`}>
          {hasWon ? title : LOST_LETTERS.map(({ letter, spin, tilt, delay }, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="lost-letter"
              style={{ '--spin': `${spin}deg`, '--tilt': `${tilt}deg`, animationDelay: `${delay}ms` } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </h2>
        <p className="text-sm text-felt-200 mt-3">{summary}</p>

        {/* Podium rankings */}
        <div className="w-full flex-1 min-h-0 overflow-y-auto space-y-2.5 my-4">
          {sortedPlayers.map((player, idx) => {
            const isWinner = player.totalScore === winners[0].totalScore;

            return (
              <div
                key={player.id}
                style={{ animationDelay: `${idx * 90}ms` }}
                className={`animate-row-in p-3 rounded-2xl border ${
                  isWinner ? 'bg-black/25 border-brass-300/70' : 'bg-black/20 border-brass-300/15'
                }`}
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-title text-xl w-6 text-center text-brass-200">{idx + 1}</span>
                  <span className="text-2xl">{player.avatar}</span>
                  <div className="text-left">
                    <span className={`font-bold text-sm ${isWinner ? 'text-brass-200' : 'text-felt-100'}`}>
                      {player.name} {player.id === currentUserId && '(Vous)'}
                    </span>
                    {player.isBot && (
                      <span className="text-[11px] text-rose-400 block">Bot IA</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-white tabular-nums flex items-center justify-end gap-1.5">
                    {gameState.doubledPlayerId === player.id && <DoubledBadge />}
                    <span><AnimatedScore value={player.totalScore} /> pts</span>
                  </div>
                  <span className="text-[11px] text-felt-400 uppercase font-semibold">
                    Score final
                  </span>
                </div>
                </div>

                <PlayerCardsReveal player={player} defaultOpen={player.id === currentUserId} />
              </div>
            );
          })}
        </div>

        {/* Play again */}
        <button
          type="button"
          onClick={onRematch}
          className="btn-primary w-full py-3 px-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer flex-shrink-0"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Revanche</span>
        </button>
        {isHost && (
          <button
            type="button"
            onClick={onRestart}
            className="mt-2 text-xs font-semibold text-felt-300 underline cursor-pointer flex-shrink-0"
          >
            Retour au salon
          </button>
        )}
      </div>
    </div>
  );
};
