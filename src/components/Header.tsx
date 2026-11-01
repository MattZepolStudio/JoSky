import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, MessageSquare, BookOpen, Share2, Check, LogOut, MoreHorizontal, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  roomCode: string;
  roundNumber: number;
  targetScore: number;
  unreadChatCount: number;
  showChat: boolean;
  isPlaying: boolean;
  hasOtherHuman: boolean;
  onToggleChat: () => void;
  onOpenScores: () => void;
  onOpenRules: () => void;
  onLeaveRoom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  roundNumber,
  targetScore,
  unreadChatCount,
  showChat,
  isPlaying,
  hasOtherHuman,
  onToggleChat,
  onOpenScores,
  onOpenRules,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideTouch = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsMenuOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsideTouch);
    return () => window.removeEventListener('pointerdown', closeOnOutsideTouch);
  }, [isMenuOpen]);

  const getLeaveMessage = () => {
    if (!hasOtherHuman) {
      return isPlaying ? 'La partie se met en pause : vous pourrez la reprendre depuis l\'accueil pendant 30 minutes.' : 'Vous êtes seul : le salon sera fermé.';
    }
    return isPlaying
      ? 'Un bot prendra votre place. Vous pourrez la reprendre depuis l\'accueil tant que la partie continue.'
      : 'Vous pourrez revenir avec le code du salon tant que la partie n\'a pas commencé.';
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyCode = async () => {
    const url = `${window.location.origin}?room=${roomCode}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full bg-felt-950/55 backdrop-blur-md border-b border-brass-300/15 px-1 sm:px-3 flex items-center justify-between sticky top-0 z-30 shadow-md flex-shrink-0">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <img
            src="/icon-192.png"
            alt="Logo JoSky"
            className="w-7 h-7 sm:w-8 sm:h-8"
          />
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-white hidden">
            JOSKY
          </span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            className="tap-tall relative flex items-center gap-1 bg-felt-800/90 border border-felt-700/80 px-2 py-0.5 rounded-lg text-[11px] font-bold text-felt-200 transition active:scale-95 cursor-pointer"
            title="Copier le lien d'invitation"
          >
            <span className="text-felt-400 font-medium hidden">Salon :</span>
            <span className="text-brass-400 tracking-wider font-mono">{roomCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-brass-400" />
            ) : (
              <Share2 className="w-3 h-3 text-felt-400" />
            )}
            {copied && (
              <span className="text-[11px] text-brass-400 font-semibold hidden sm:inline">
                Copié !
              </span>
            )}
          </button>
        )}
      </div>

      {/* Center status: Round info */}
      <div className="hidden md:flex items-center gap-2 text-xs font-bold bg-felt-950/60 px-3 py-0.5 rounded-full border border-felt-800 text-felt-300">
        <span>Manche {roundNumber}</span>
        <span className="text-felt-600">•</span>
        <span className="text-brass-300">Objectif: {targetScore === 1 ? '1 manche' : `${targetScore} pts`}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center">
        {/* PWA Install Button */}
        <PWAInstallButton compact />

        {/* Scores button */}
        {isPlaying && (
          <button
            type="button"
            onClick={onOpenScores}
            aria-label="Voir les scores"
            className="w-10 min-[380px]:w-11 h-11 flex items-center justify-center rounded-xl text-felt-200 active:bg-black/20 transition cursor-pointer"
          >
            <Trophy className="w-5 h-5" />
          </button>
        )}

        {/* Chat button with badge */}
        {showChat && (
          <button
            type="button"
            onClick={onToggleChat}
            aria-label="Ouvrir le chat"
            className="relative w-10 min-[380px]:w-11 h-11 flex items-center justify-center rounded-xl text-felt-200 active:bg-black/20 transition cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[11px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>
        )}

        {/* Everything secondary lives in one menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={isMenuOpen}
            className="w-10 min-[380px]:w-11 h-11 flex items-center justify-center rounded-xl text-felt-200 active:bg-black/20 transition cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 p-1 rounded-2xl bg-felt-900 border border-brass-300/25 shadow-2xl animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenRules();
                }}
                className="w-full h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-felt-100 active:bg-black/20 cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-brass-300" />
                <span>Comment jouer</span>
              </button>
              <button type="button" onClick={handleToggleSound} className="w-full h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-felt-100 active:bg-black/20 cursor-pointer">
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-brass-300" />}
                <span>{isMuted ? 'Son coupé' : 'Son activé'}</span>
              </button>
              {roomCode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowConfirmLeave(true);
                  }}
                  className="w-full h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-felt-100 active:bg-black/20 cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-rose-400" />
                  <span>{isPlaying ? 'Quitter la partie' : 'Quitter le salon'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave confirmation modal. Portal: the header blur would trap a fixed element */}
      {showConfirmLeave && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowConfirmLeave(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-full overflow-y-auto bg-felt-900 border border-felt-700/80 rounded-2xl p-5 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 id="leave-title" className="font-extrabold text-lg text-white mb-1.5">
              {isPlaying ? 'Quitter la partie ?' : 'Quitter le salon ?'}
            </h3>
            <p className="text-sm text-felt-300 mb-5 leading-relaxed">
              {getLeaveMessage()}
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                className="flex-1 py-3 px-3 rounded-xl bg-felt-800 hover:bg-felt-700 text-felt-200 font-bold text-sm border border-felt-700 transition cursor-pointer active:scale-95"
              >
                Rester
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveRoom();
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
