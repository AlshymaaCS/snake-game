import React from 'react';
import { styles } from '../styles';
import type { GameMode } from '../types';

interface Props {
  score: number;
  highScore: number;
  mode: GameMode;
}

const pad = (n: number) => String(n).padStart(3, '0');

export const Scoreboard: React.FC<Props> = ({ score, highScore, mode }) => (
  <div style={styles.scoreboard}>
    <div style={styles.scoreItem}>
      <span style={styles.scoreLabel}>SCORE</span>
      <span style={styles.scoreValue}>{pad(score)}</span>
    </div>
    <div style={styles.scoreItem}>
      <span style={styles.modeBadge}>
        {mode === 'CLASSIC' ? 'CLASSIC' : 'WRAP'}
      </span>
    </div>
    <div style={styles.scoreItem}>
      <span style={styles.scoreLabel}>HIGH</span>
      <span style={styles.scoreValue}>{pad(highScore)}</span>
    </div>
  </div>
);
