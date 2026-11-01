import React, { useLayoutEffect, useRef } from 'react';
import { ChatMessage } from '../types/game';

interface ChatBubblesProps {
  messages: ChatMessage[];
  onOpenChat: () => void;
}

const SCREEN_MARGIN_PX = 8;
const BELOW_NAME_PX = 34;
const STACK_GAP_PX = 6;

const Bubble: React.FC<{ message: ChatMessage; onOpenChat: () => void }> = ({ message, onOpenChat }) => {
  const elementRef = useRef<HTMLButtonElement>(null);

  // Speech bubble on the sender, or at the top of the screen when they are not on the table
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const anchor = document.querySelector(`[data-player-anchor="${message.senderId}"]`)?.getBoundingClientRect();
    const width = element.offsetWidth;
    const center = anchor ? anchor.left + anchor.width / 2 : window.innerWidth / 2;
    const left = Math.max(SCREEN_MARGIN_PX, Math.min(center - width / 2, window.innerWidth - width - SCREEN_MARGIN_PX));
    let top = anchor ? anchor.top + BELOW_NAME_PX : 56;

    // Slides under any bubble already on screen at that spot
    document.querySelectorAll('.chat-bubble').forEach((other) => {
      const box = other.getBoundingClientRect();
      const isSameColumn = other !== element && left < box.right && left + width > box.left;
      if (isSameColumn && top < box.bottom + STACK_GAP_PX) top = box.bottom + STACK_GAP_PX;
    });

    element.style.left = `${left}px`;
    element.style.top = `${Math.min(top, window.innerHeight - element.offsetHeight - SCREEN_MARGIN_PX)}px`;
  }, []);

  return (
    <button
      ref={elementRef}
      type="button"
      onClick={onOpenChat}
      className="chat-bubble pointer-events-auto fixed max-w-[min(260px,80vw)] px-3 py-1.5 rounded-2xl bg-brass-100 text-brass-950 shadow-2xl text-left animate-bubble-in cursor-pointer"
    >
      <span className="block text-[11px] font-black leading-tight">{message.senderName}</span>
      <span className="block text-sm font-semibold leading-snug break-words">{message.text}</span>
    </button>
  );
};

// Messages stay readable without opening the chat
export const ChatBubbles: React.FC<ChatBubblesProps> = ({ messages, onOpenChat }) => (
  <div className="fixed inset-0 z-[55] pointer-events-none">
    {messages.map((message) => (
      <Bubble key={message.id} message={message} onOpenChat={onOpenChat} />
    ))}
  </div>
);
