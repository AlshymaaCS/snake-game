import React from 'react';
import { styles } from '../styles';
import type { LeaderboardEntry } from '../types';

interface Props {
  entries: LeaderboardEntry[];
}

const pad = (n: number) => String(n).padStart(3, '0');

export const Leaderboard: React.FC<Props> = ({ entries }) => (
  <div style={styles.leaderboard}>
    <div style={styles.leaderboardTitle}>TOP 10</div>
    {entries.length === 0 ? (
      <div style={styles.leaderboardEmpty}>No scores yet</div>
    ) : (
      <ol style={styles.leaderboardList}>
        {entries.map((e, i) => (
          <li key={`${e.date}-${i}`} style={styles.leaderboardRow}>
            <span style={styles.leaderboardRank}>{i + 1}.</span>
            <span style={styles.leaderboardName}>{e.name}</span>
            <span style={styles.leaderboardScore}>{pad(e.score)}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);
