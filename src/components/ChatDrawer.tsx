import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChatMessage } from '../types/game';
import { X, Send, ArrowDown, Bell, BellOff } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onSendMessage: (text: string) => void;
}

const QUICK_EMOJIS = ['👏', '😂', '😱', '🎯', '🃏', '🔥', '💀', '🤫'];
const QUICK_PHRASES = ['Bien joué !', 'Aïe !', 'Trop fort', 'Oups...', 'Merci !', 'Vite !', 'Bonne chance', 'Revanche ?'];

const EMOJI_ONLY = /^(\p{Extended_Pictographic}|\p{Emoji_Modifier}|️|‍|\s){1,12}$/u;
const NEAR_BOTTOM_PX = 60;

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  isMuted,
  onToggleMute,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEvents, setShowEvents] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastCountRef = useRef(0);

  const visibleMessages = showEvents ? messages : messages.filter((msg) => !msg.isSystem);

  const scrollToEnd = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    isAtBottomRef.current = true;
    setHasNewBelow(false);
  };

  // Always open on the latest messages
  useLayoutEffect(() => {
    if (isOpen) scrollToEnd();
    lastCountRef.current = visibleMessages.length;
  }, [isOpen, showEvents]);

  // Follow new messages, unless the player scrolled up to read
  useLayoutEffect(() => {
    if (!isOpen) return;
    const added = visibleMessages.slice(lastCountRef.current);
    lastCountRef.current = visibleMessages.length;
    if (added.length === 0) return;

    if (isAtBottomRef.current || added.some((msg) => msg.senderId === currentUserId)) {
      scrollToEnd();
    } else {
      setHasNewBelow(true);
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const list = e.currentTarget;
    isAtBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
    if (isAtBottomRef.current) setHasNewBelow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 animate-fade-in">
      {/* Touching the game above the panel closes it */}
      <div className="flex-1 min-h-[15dvh]" onClick={onClose}></div>

      <div
        role="dialog"
        aria-label="Chat"
        className="w-full max-w-lg mx-auto h-[68dvh] bg-slate-900 border-t border-x border-slate-700 rounded-t-2xl flex flex-col shadow-2xl animate-sheet-up"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
          <h3 className="font-bold text-sm text-white flex-1">Chat</h3>
          <button
            type="button"
            onClick={() => setShowEvents((show) => !show)}
            aria-pressed={showEvents}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              showEvents
                ? 'bg-indigo-600/30 border-indigo-400/60 text-indigo-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            Événements
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activer les notifications du chat' : 'Couper les notifications du chat'}
            className="p-2 rounded-lg text-slate-300 bg-slate-800/80 cursor-pointer"
          >
            {isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le chat"
            className="p-2 rounded-lg text-slate-300 bg-slate-800/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages List */}
        <div className="relative flex-1 min-h-0">
          <div ref={listRef} onScroll={handleScroll} className="h-full overflow-y-auto p-3 space-y-1">
            {visibleMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <span className="text-3xl mb-2">👋</span>
                <p className="text-sm font-semibold">Aucun message pour l'instant</p>
                <p className="text-xs text-slate-500 mt-1">
                  Lancez la conversation avec un emoji ou une phrase rapide !
                </p>
              </div>
            ) : (
              visibleMessages.map((msg, index) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="text-center py-1">
                      <span className="inline-block text-[11px] bg-slate-800/90 text-indigo-300 border border-slate-700/60 px-2.5 py-1 rounded-full font-medium max-w-[90%] leading-relaxed">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.senderId === currentUserId;
                const previous = visibleMessages[index - 1];
                const startsGroup = !previous || previous.isSystem || previous.senderId !== msg.senderId;
                const isEmojiOnly = EMOJI_ONLY.test(msg.text);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${startsGroup ? 'pt-2' : ''}`}
                  >
                    {!isMe && (
                      <span className="text-xl w-7 text-center flex-shrink-0">
                        {startsGroup ? msg.senderAvatar : ''}
                      </span>
                    )}
                    <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && startsGroup && (
                        <span className="text-[10px] font-bold text-amber-300 mb-0.5 px-1">
                          {msg.senderName}
                        </span>
                      )}
                      {isEmojiOnly ? (
                        <span className="text-3xl leading-tight">{msg.text}</span>
                      ) : (
                        <div
                          className={`rounded-2xl px-3 py-1.5 text-sm break-words font-medium leading-snug ${
                            isMe
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-100 border border-slate-700/80'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasNewBelow && (
            <button
              type="button"
              onClick={scrollToEnd}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg flex items-center gap-1 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Nouveaux messages</span>
            </button>
          )}
        </div>

        {/* One-tap answers: no keyboard needed, so they make room for the messages while typing */}
        <div className={`flex-shrink-0 border-t border-slate-800 bg-slate-950/40 px-2 pt-1.5 ${isTyping ? 'hidden' : ''}`}>
          <div className="grid grid-cols-8">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendMessage(emoji)}
                aria-label={`Envoyer ${emoji}`}
                className="text-xl py-1 rounded-lg active:scale-90 active:bg-slate-800 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1.5">
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => onSendMessage(phrase)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2 flex-shrink-0"
        >
          {/* 16px text: iOS zooms the page on anything smaller */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            placeholder="Écrire un message..."
            aria-label="Écrire un message"
            maxLength={180}
            enterKeyHint="send"
            autoComplete="off"
            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Envoyer"
            onPointerDown={(e) => e.preventDefault()}
            className="p-2.5 rounded-xl bg-indigo-600 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
