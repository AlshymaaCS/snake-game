import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeContext';

interface Props {
  score: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const NamePrompt: React.FC<Props> = ({ score, onSubmit, onCancel }) => {
  const { styles } = useTheme();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't let arrow keys / space leak through to the game controls.
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      style={styles.modalOverlay}
      onClick={onCancel}
      onKeyDown={(e) => e.stopPropagation()}>
      <div
        style={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-prompt-title">
        <div id="name-prompt-title" style={styles.modalTitle}>
          NEW HIGH SCORE
        </div>
        <div style={styles.modalScore}>{score}</div>
        <div style={styles.modalSubtitle}>Enter your name</div>
        <input
          ref={inputRef}
          style={styles.modalInput}
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 12))}
          onKeyDown={handleKeyDown}
          maxLength={12}
          placeholder="PLAYER"
          aria-label="Player name"
        />
        <div style={styles.modalActions}>
          <button style={styles.btnGhost} onClick={onCancel}>
            Skip
          </button>
          <button
            style={styles.btn}
            onClick={submit}
            disabled={name.trim().length === 0}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
