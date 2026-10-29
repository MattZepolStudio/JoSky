import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/game';
import { X, Send, Smile } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

const QUICK_EMOJIS = ['👏', '😂', '😱', '🎯', '🃏', '🔥', '💀', '🤫'];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    onSendMessage(emoji);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Slide-in container (full width on small mobile, max-w-sm on desktop/tablet) */}
      <div className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h3 className="font-bold text-base text-white">Chat en direct</h3>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
              {messages.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Reactions Bar for fast mobile tapping */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
            <Smile className="w-3 h-3 text-amber-400" />
            Réactions :
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base sm:text-lg hover:scale-125 active:scale-95 transition-transform p-1 rounded hover:bg-slate-800 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
              <span className="text-3xl mb-2">👋</span>
              <p className="text-sm font-semibold">Le chat est calme...</p>
              <p className="text-xs text-slate-500 mt-1">
                Envoyez un message ou un emoji à vos amis !
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;

              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block text-[11px] bg-slate-800/90 text-indigo-300 border border-slate-700/60 px-2.5 py-1 rounded-full font-medium max-w-[90%] leading-relaxed">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <span className="text-xl flex-shrink-0 mb-1">
                      {msg.senderAvatar}
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isMe
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/80'
                    }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-bold text-amber-300 mb-0.5">
                        {msg.senderName}
                      </div>
                    )}
                    <div className="break-words font-medium leading-relaxed">
                      {msg.text}
                    </div>
                    <div
                      className={`text-[9px] text-right mt-1 font-mono ${
                        isMe ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {isMe && (
                    <span className="text-xl flex-shrink-0 mb-1">
                      {msg.senderAvatar}
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Écrivez un message..."
            maxLength={180}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
