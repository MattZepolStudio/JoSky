import React, { useLayoutEffect, useState } from 'react';
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

  const isLastStep = step === 'goal';

  return (
    <div
      className="fixed inset-x-0 z-30 px-3 flex justify-center pointer-events-none"
      style={{ bottom }}
    >
      <div key={step} className="w-full max-w-sm rounded-2xl bg-brass-100 text-brass-950 px-3 py-2 shadow-2xl animate-bubble-in">
        <p className="text-xs font-semibold leading-snug">{TUTORIAL_TEXT[step]}</p>
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={onFinish}
            className="pointer-events-auto px-2 py-3 -my-2 text-xs font-bold text-brass-800 underline cursor-pointer"
          >
            {isLastStep ? 'Compris !' : 'Passer le tutoriel'}
          </button>
        </div>
      </div>
    </div>
  );
};
