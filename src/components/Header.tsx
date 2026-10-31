import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, MessageSquare, BookOpen, Share2, Check, LogOut } from 'lucide-react';
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
  onOpenRules,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

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
    <header className="w-full bg-felt-950/55 backdrop-blur-md border-b border-brass-300/15 px-2 py-1 xs:px-3 xs:py-1 sm:px-4 sm:py-1.5 flex items-center justify-between sticky top-0 z-30 shadow-md flex-shrink-0">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <img
            src="/icon-192.png"
            alt="Logo JoSky"
            className="w-7 h-7 sm:w-8 sm:h-8"
          />
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-white hidden xs:inline">
            JOSKY
          </span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 bg-felt-800/90 hover:bg-felt-750 border border-felt-700/80 px-2 py-0.5 rounded-lg text-[11px] font-bold text-felt-200 transition active:scale-95 cursor-pointer"
            title="Copier le lien d'invitation"
          >
            <span className="text-felt-400 font-medium hidden xs:inline">Salon :</span>
            <span className="text-brass-400 tracking-wider font-mono">{roomCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-brass-400" />
            ) : (
              <Share2 className="w-3 h-3 text-felt-400" />
            )}
            {copied && (
              <span className="text-[9px] text-brass-400 font-semibold hidden sm:inline">
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
        <span className="text-amber-400">Objectif: {targetScore === 1 ? '1 manche' : `${targetScore} pts`}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* PWA Install Button */}
        <PWAInstallButton compact />

        {/* Rules button */}
        <button
          type="button"
          onClick={onOpenRules}
          aria-label="Règles du jeu"
          className="p-1.5 rounded-lg bg-felt-800/80 hover:bg-felt-700 text-felt-300 hover:text-white transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>

        {/* Audio Mute toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="p-2 rounded-xl bg-felt-800/80 hover:bg-felt-700 text-felt-300 hover:text-white transition cursor-pointer"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brass-400" />
          )}
        </button>

        {/* Chat button with badge */}
        {showChat && (
          <button
            type="button"
            onClick={onToggleChat}
            aria-label="Ouvrir le chat"
            className="relative p-2 rounded-xl bg-brass-600/30 hover:bg-brass-600/40 text-brass-200 border border-brass-500/40 transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>
        )}

        {/* Leave button */}
        {roomCode && (
          <button
            type="button"
            onClick={() => setShowConfirmLeave(true)}
            aria-label="Quitter le salon"
            className="p-2 rounded-xl bg-felt-800/60 hover:bg-rose-950/40 text-felt-400 hover:text-rose-300 transition cursor-pointer"
            title={isPlaying ? 'Quitter la partie' : 'Quitter le salon'}
          >
            <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
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
