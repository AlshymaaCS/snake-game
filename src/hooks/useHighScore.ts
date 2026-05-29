import { useEffect, useState } from 'react';
import { HIGH_SCORE_KEY } from '../constants';

/** Reads/writes the local high score in localStorage. */
export function useHighScore(currentScore: number): number {
  const [highScore, setHighScore] = useState(0);

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) setHighScore(n);
      }
    } catch {
      /* localStorage may be unavailable (private mode, SSR) */
    }
  }, []);

  // Persist whenever score beats the record.
  useEffect(() => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(currentScore));
      } catch {
        /* ignore */
      }
    }
  }, [currentScore, highScore]);

  return highScore;
}
