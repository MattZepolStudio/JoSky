import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface AnimatedScoreProps {
  value: number;
  showPlus?: boolean;
}

export const AnimatedScore: React.FC<AnimatedScoreProps> = ({ value, showPlus = false }) => {
  const current = useCountUp(value);
  return <>{showPlus && current > 0 ? `+${current}` : current}</>;
};

export const DoubledBadge: React.FC = () => (
  <span className="animate-stamp inline-block px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-black">
    ×2
  </span>
);
