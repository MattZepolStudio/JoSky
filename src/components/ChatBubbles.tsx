import React from 'react';
import { ChatMessage } from '../types/game';

interface ChatBubblesProps {
  messages: ChatMessage[];
  onOpenChat: () => void;
}

// Short previews over the game, so a message can be read without opening the chat
export const ChatBubbles: React.FC<ChatBubblesProps> = ({ messages, onOpenChat }) => {
  if (messages.length === 0) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-14 z-40 w-full max-w-xs px-3 flex flex-col items-center gap-1 pointer-events-none">
      {messages.map((msg) => (
        <button
          key={msg.id}
          type="button"
          onClick={onOpenChat}
          className="pointer-events-auto max-w-full flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-felt-900/95 border border-felt-600 shadow-xl text-left animate-bubble-in cursor-pointer"
        >
          <span className="text-base flex-shrink-0">{msg.senderAvatar}</span>
          <span className="text-[11px] font-bold text-brass-300 flex-shrink-0">{msg.senderName}</span>
          <span className="text-xs text-felt-100 truncate">{msg.text}</span>
        </button>
      ))}
    </div>
  );
};
