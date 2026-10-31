import React, { useLayoutEffect, useRef } from 'react';
import { JoskyCard as JoskyCardType } from '../types/game';
import { JoskyCard } from './JoskyCard';

export interface CardFlight {
  id: number;
  card: JoskyCardType;
  fromRect: DOMRect;
  to: string;
  delayMs: number;
}

const FLIGHT_MS = 300;

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
    const scaled = (rect: DOMRect) =>
      `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / element.offsetWidth}, ${rect.height / element.offsetHeight})`;

    // The real card waits for the flying copy before showing up
    const hideTarget = target.animate([{ opacity: 0 }, { opacity: 0 }], { duration: delayMs + FLIGHT_MS });
    const animation = element.animate(
      [{ transform: scaled(fromRect) }, { transform: scaled(toRect) }],
      { duration: FLIGHT_MS, delay: delayMs, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)', fill: 'both' }
    );
    animation.onfinish = () => onDone(flight.id);

    return () => {
      hideTarget.cancel();
      animation.cancel();
    };
  }, []);

  return (
    <div ref={elementRef} className="fixed left-0 top-0 origin-top-left" style={{ transform: 'translateX(-200vw)' }}>
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
