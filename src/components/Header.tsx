import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, MessageSquare, BookOpen, Share2, Check, LogOut, MoreHorizontal, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';
import { IS_PHONE_APP } from '../platform';

interface HeaderProps {
  roomCode: string;
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
    const url = IS_PHONE_APP ? roomCode : `${window.location.origin}?room=${roomCode}`;
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
        {!IS_PHONE_APP && (
          <div className="flex items-center gap-1.5">
            <img
              src={`${import.meta.env.BASE_URL}icon-192.png`}
              alt="Logo JoSky"
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white hidden">
              JOSKY
            </span>
          </div>
        )}

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
              <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white font-extrabold text-[11px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setShowConfirmLeave(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            onClick={(e) => e.stopPropagation()}
            className="table-plate relative w-full max-w-sm max-h-full overflow-y-auto rounded-3xl px-6 py-7 text-center"
          >
            <h3 id="leave-title" className="text-2xl text-white mb-2">
              {isPlaying ? 'Quitter la partie ?' : 'Quitter le salon ?'}
            </h3>
            <p className="text-sm text-felt-200 mb-6 leading-relaxed">
              {getLeaveMessage()}
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                className="btn-primary flex-1 py-3 px-3 rounded-2xl font-black text-sm transition cursor-pointer active:scale-95"
              >
                Rester
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveRoom();
                }}
                className="btn-secondary flex-1 py-3 px-3 rounded-2xl font-bold text-sm transition cursor-pointer active:scale-95"
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
