import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import qrcode from 'qrcode-generator';
import { Check, Copy, MessageCircle, Send, Share2, X } from 'lucide-react';

interface InviteSheetProps {
  roomCode: string;
  onClose: () => void;
}

const COPIED_MS = 2000;

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

function createQrImage(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(8, 16);
}

export const InviteSheet: React.FC<InviteSheetProps> = ({ roomCode, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);

  const url = `${window.location.origin}?room=${roomCode}`;
  const message = `Viens jouer à JoSky avec moi ! Salon ${roomCode} : ${url}`;
  const encodedMessage = encodeURIComponent(message);
  const qrImage = useMemo(() => createQrImage(url), [url]);
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await copyText(url);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: 'JoSky', text: message });
    } catch {
      // The player closed the share menu
    }
  };

  const optionClass = 'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm cursor-pointer active:scale-98 transition';

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Inviter des amis"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-full overflow-y-auto mx-auto bg-felt-900 border-t sm:border border-brass-300/25 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-sheet-up"
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-2xl text-white leading-none">Inviter des amis</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 -mt-1 rounded-xl text-felt-300 bg-black/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <img
            src={qrImage}
            alt={`QR code du salon ${roomCode}`}
            className="w-32 h-32 rounded-2xl bg-white flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-sm text-felt-200 leading-snug">
            À côté de vous ? Faites scanner ce code, ou donnez le code du salon :
            <span className="block text-3xl text-brass-200 tracking-widest mt-1" style={{ fontFamily: 'Gloock, Georgia, serif' }}>
              {roomCode}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodedMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${optionClass} btn-primary`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
          <a href={`sms:?&body=${encodedMessage}`} className={`${optionClass} btn-primary`}>
            <Send className="w-4 h-4" />
            <span>SMS</span>
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className={`${optionClass} btn-secondary ${canShare ? '' : 'col-span-2'}`}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Lien copié !' : 'Copier le lien'}</span>
          </button>
          {canShare && (
            <button type="button" onClick={handleShare} className={`${optionClass} btn-secondary`}>
              <Share2 className="w-4 h-4" />
              <span>Plus d'options</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
