import type { Direction, Point } from './types';

// ---------- Grid ----------
export const GRID_COLS = 20;
export const GRID_ROWS = 20;

// Logical canvas size in CSS pixels — scaled responsively by CSS.
export const CANVAS_PIXEL_SIZE = 400;
export const CELL_SIZE = CANVAS_PIXEL_SIZE / GRID_COLS;

// ---------- Speed ----------
export const INITIAL_SPEED_MS = 160;
export const MIN_SPEED_MS = 60;
export const SPEED_STEP_MS = 10;
export const FOOD_PER_SPEEDUP = 5;

// ---------- Palette (Nokia 3310 LCD + plastic shell) ----------
// LCD: pea-soup green, dark pixels.
export const COLOR_BG = '#9ead86';
export const COLOR_FG = '#1a1d14';
export const COLOR_BG_DIM = '#8a9a74';
// Phone body: classic dark navy/charcoal plastic with light accents.
export const COLOR_SHELL = '#1d2330';
export const COLOR_SHELL_DARK = '#11151e';
export const COLOR_SHELL_LIGHT = '#2a3344';
export const COLOR_KEY = '#23293a';
export const COLOR_KEY_TEXT = '#e6e3d6';
export const COLOR_BRAND = '#e6e3d6';

// ---------- Persistence ----------
export const HIGH_SCORE_KEY = 'snake_nokia_highscore_v1';
export const LEADERBOARD_KEY = 'snake_nokia_leaderboard_v1';
export const LEADERBOARD_SIZE = 10;

// ---------- Direction tables ----------
export const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export const DIR_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
