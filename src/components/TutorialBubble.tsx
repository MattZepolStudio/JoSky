import React, { useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TUTORIAL_TEXT, TutorialStep } from '../utils/tutorial';

interface TutorialBubbleProps {
  step: TutorialStep;
  onFinish: () => void;
}

// Sits just above the table, close to the piles it talks about, and never blocks a card
export const TutorialBubble: React.FC<TutorialBubbleProps> = ({ step, onFinish }) => {
  const [bottom, setBottom] = useState(0);

  useLayoutEffect(() => {
    const place = () => {
      const table = document.querySelector('[data-table-anchor]');
      if (table) setBottom(window.innerHeight - table.getBoundingClientRect().top + 6);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [step]);

  return (
    <div
      className="fixed inset-x-0 z-30 px-3 flex justify-center pointer-events-none"
      style={{ bottom }}
    >
      <div key={step} className="max-w-sm flex items-center gap-1 rounded-full bg-brass-100 text-brass-950 pl-4 pr-1 shadow-2xl animate-bubble-in">
        <p className="text-xs font-bold leading-tight py-2">{TUTORIAL_TEXT[step]}</p>
        <button
          type="button"
          onClick={onFinish}
          aria-label="Passer le tutoriel"
          className="pointer-events-auto flex-shrink-0 w-9 h-9 flex items-center justify-center text-brass-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
