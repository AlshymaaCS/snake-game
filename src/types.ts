export type Point = { x: number; y: number };
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type GameMode = 'CLASSIC' | 'WRAP';
export type GameStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'GAME_OVER';
export type LeaderboardEntry = { name: string; score: number; date: number };

export type ObstacleKind = 'LUIS' | 'SJ';
export type Obstacle = {
  kind: ObstacleKind;
  x: number;
  y: number;
  /** Wall-clock time (ms) at which this obstacle should disappear. */
  expiresAt: number;
};

export type PowerUpKind = 'JEN';
export type PowerUp = {
  kind: PowerUpKind;
  x: number;
  y: number;
  /** Wall-clock time (ms) at which this power-up should disappear. */
  expiresAt: number;
};
