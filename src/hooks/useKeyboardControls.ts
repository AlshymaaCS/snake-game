import { useEffect } from 'react';
import type { Direction, GameStatus } from '../types';

interface Options {
  status: GameStatus;
  onDirection: (dir: Direction) => void;
  onStartPause: () => void;
  onAutoStart: () => void;
}

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  W: 'UP',
  s: 'DOWN',
  S: 'DOWN',
  a: 'LEFT',
  A: 'LEFT',
  d: 'RIGHT',
  D: 'RIGHT',
};

/** Arrow keys + WASD movement, Space to pause/resume. Prevents page scroll. */
export function useKeyboardControls({
  status,
  onDirection,
  onStartPause,
  onAutoStart,
}: Options): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onStartPause();
        return;
      }
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        if (status === 'IDLE') onAutoStart();
        onDirection(dir);
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, onDirection, onStartPause, onAutoStart]);
}
