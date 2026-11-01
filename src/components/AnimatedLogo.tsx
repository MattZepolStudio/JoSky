import React from 'react';
import logo from '../../public/icon.svg?raw';

// Inlined rather than loaded as an image, so the CSS can reach the three cards
export const AnimatedLogo: React.FC = () => (
  <div
    role="img"
    aria-label="JoSky"
    className="animated-logo w-32 h-32 sm:w-36 sm:h-36 drop-shadow-2xl"
    dangerouslySetInnerHTML={{ __html: logo }}
  />
);
