import { useCallback, useEffect, useState } from 'react';
import { LEADERBOARD_KEY, LEADERBOARD_SIZE } from '../constants';
import type { LeaderboardEntry } from '../types';

function loadEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is LeaderboardEntry =>
          e &&
          typeof e.name === 'string' &&
          typeof e.score === 'number' &&
          typeof e.date === 'number',
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  } catch {
    return [];
  }
}

/** Manages the top-N leaderboard in localStorage. */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  /** Returns true if `score` would make it into the top N (and is > 0). */
  const qualifies = useCallback(
    (score: number): boolean => {
      if (score <= 0) return false;
      if (entries.length < LEADERBOARD_SIZE) return true;
      const lowest = entries[entries.length - 1].score;
      return score > lowest;
    },
    [entries],
  );

  const submit = useCallback((name: string, score: number) => {
    setEntries((prev) => {
      const entry: LeaderboardEntry = {
        name: name.slice(0, 12) || 'PLAYER',
        score,
        date: Date.now(),
      };
      const next = [...prev, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_SIZE);
      try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { entries, qualifies, submit };
}
