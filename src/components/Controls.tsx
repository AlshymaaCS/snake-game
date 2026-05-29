import React from 'react';
import { styles } from '../styles';
import type { GameMode } from '../types';

interface Props {
  startPauseLabel: string;
  mode: GameMode;
  onStartPause: () => void;
  onRestart: () => void;
  onToggleMode: () => void;
}

export const Controls: React.FC<Props> = ({
  startPauseLabel,
  mode,
  onStartPause,
  onRestart,
  onToggleMode,
}) => (
  <div style={styles.controlsRow}>
    <button style={styles.btn} onClick={onStartPause}>
      {startPauseLabel}
    </button>
    <button style={styles.btn} onClick={onRestart}>
      Restart
    </button>
    <button style={styles.btnGhost} onClick={onToggleMode}>
      Mode: {mode === 'CLASSIC' ? 'Classic' : 'Wrap'}
    </button>
  </div>
);
