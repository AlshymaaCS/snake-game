import { DIR_VECTORS, GRID_COLS, GRID_ROWS } from '../constants';
import type { Direction, Point } from '../types';

export const initialSnake = (): Point[] => [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
];

const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

/** Pick a uniformly-random empty cell for the next food. */
export const randomFood = (snake: Point[]): Point => {
  const occupied = new Set(snake.map(key));
  const free: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
};

/**
 * Pick a random empty cell suitable for an obstacle.
 *
 * Avoids the snake, the food, any already-placed obstacles, and the two cells
 * directly in front of the snake's head along its current direction (so
 * obstacles never appear right where the player is about to move). Returns
 * null if no such cell exists.
 */
export const randomObstacleSpot = (
  snake: Point[],
  food: Point,
  direction: Direction,
  blocked: { x: number; y: number }[] = [],
): Point | null => {
  const taken = new Set<string>();
  snake.forEach((s) => taken.add(key(s)));
  taken.add(key(food));
  blocked.forEach((b) => taken.add(key(b)));

  // Exclude the 2 cells directly in front of the head (with wrap).
  const head = snake[0];
  const v = DIR_VECTORS[direction];
  for (let i = 1; i <= 2; i++) {
    const fx = (head.x + v.x * i + GRID_COLS) % GRID_COLS;
    const fy = (head.y + v.y * i + GRID_ROWS) % GRID_ROWS;
    taken.add(`${fx},${fy}`);
  }

  const free: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
};
