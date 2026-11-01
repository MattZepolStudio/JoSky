import React, { useLayoutEffect, useRef } from 'react';
import { JoskyCard as JoskyCardType } from '../types/game';
import { JoskyCard } from './JoskyCard';

export interface CardFlight {
  id: number;
  card: JoskyCardType;
  fromRect: DOMRect;
  to: string;
  delayMs: number;
  isBurst?: boolean;
}

const FLIGHT_MS = 320;
const BURST_MS = 620;
const ARC_LIFT_PX = 26;
const MAX_TILT_DEG = 9;

export const findCardAnchor = (name: string) =>
  document.querySelector<HTMLElement>(`[data-card-anchor="${name}"]`);

const Flight: React.FC<{ flight: CardFlight; onDone: (id: number) => void }> = ({ flight, onDone }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    const target = findCardAnchor(flight.to);
    const toRect = target?.getBoundingClientRect();
    if (!element || !target || !toRect || toRect.width === 0) {
      onDone(flight.id);
      return;
    }

    const { fromRect, delayMs } = flight;
    const scaled = (rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, extra = '') =>
      `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / element.offsetWidth}, ${rect.height / element.offsetHeight}) ${extra}`;

    const duration = flight.isBurst ? BURST_MS : FLIGHT_MS;
    const tilt = (toRect.left >= fromRect.left ? 1 : -1) * MAX_TILT_DEG;
    const middle = {
      left: (fromRect.left + toRect.left) / 2,
      top: (fromRect.top + toRect.top) / 2 - ARC_LIFT_PX,
      width: (fromRect.width + toRect.width) / 2,
      height: (fromRect.height + toRect.height) / 2,
    };

    // The real card waits for the flying copy before showing up
    const hideTarget = flight.isBurst ? null : target.animate([{ opacity: 0 }, { opacity: 0 }], { duration: delayMs + duration });
    const frames = flight.isBurst
      ? [
          { transform: scaled(fromRect) },
          { transform: scaled(fromRect, `scale(1.28) rotate(${tilt}deg)`), offset: 0.3 },
          { transform: scaled(middle, `rotate(${-tilt}deg)`), offset: 0.65 },
          { transform: scaled(toRect) },
        ]
      : [
          { transform: scaled(fromRect) },
          { transform: scaled(middle, `rotate(${tilt}deg)`), offset: 0.5 },
          { transform: scaled(toRect) },
        ];
    const animation = element.animate(frames, { duration, delay: delayMs, easing: 'ease-in-out', fill: 'both' });
    animation.onfinish = () => {
      // A small bounce gives the card some weight as it lands
      target.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' });
      onDone(flight.id);
    };

    return () => {
      hideTarget?.cancel();
      animation.cancel();
    };
  }, []);

  return (
    <div ref={elementRef} className={`fixed left-0 top-0 origin-top-left ${flight.isBurst ? 'card-burst' : ''}`} style={{ transform: 'translateX(-200vw)' }}>
      <JoskyCard card={flight.card} size="table" />
    </div>
  );
};

export const CardFlightLayer: React.FC<{ flights: CardFlight[]; onDone: (id: number) => void }> = ({ flights, onDone }) => (
  <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" aria-hidden="true">
    {flights.map((flight) => (
      <Flight key={flight.id} flight={flight} onDone={onDone} />
    ))}
  </div>
);
