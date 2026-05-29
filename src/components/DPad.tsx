import React from 'react';
import { styles } from '../styles';
import type { Direction } from '../types';

interface Props {
  onDirection: (dir: Direction) => void;
  onCenter: () => void;
}

/** Mobile-friendly D-Pad. Uses touchStart for snappy taps without ghost-clicks. */
export const DPad: React.FC<Props> = ({ onDirection, onCenter }) => {
  const handleTouch = (dir: Direction) => (e: React.TouchEvent) => {
    e.preventDefault();
    onDirection(dir);
  };
  const handleClick = (dir: Direction) => () => onDirection(dir);

  return (
    <div style={styles.dpadWrap} aria-label="On-screen D-Pad">
      <span />
      <button
        style={styles.dpadBtn}
        onClick={handleClick('UP')}
        onTouchStart={handleTouch('UP')}
        aria-label="Up"
      >
        ▲
      </button>
      <span />
      <button
        style={styles.dpadBtn}
        onClick={handleClick('LEFT')}
        onTouchStart={handleTouch('LEFT')}
        aria-label="Left"
      >
        ◀
      </button>
      <button style={styles.dpadCenter} onClick={onCenter} aria-label="Start/Pause">
        ●
      </button>
      <button
        style={styles.dpadBtn}
        onClick={handleClick('RIGHT')}
        onTouchStart={handleTouch('RIGHT')}
        aria-label="Right"
      >
        ▶
      </button>
      <span />
      <button
        style={styles.dpadBtn}
        onClick={handleClick('DOWN')}
        onTouchStart={handleTouch('DOWN')}
        aria-label="Down"
      >
        ▼
      </button>
      <span />
    </div>
  );
};
