import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DIR_VECTORS,
  FOOD_PER_SPEEDUP,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_SPEED_MS,
  MIN_SPEED_MS,
  OPPOSITE,
  SPEED_STEP_MS,
} from '../constants';
import { useGameLoop } from '../hooks/useGameLoop';
import { useHighScore } from '../hooks/useHighScore';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useEatSound } from '../hooks/useEatSound';
import { useSounds } from '../hooks/useSounds';
import { useTheme } from '../ThemeContext';
import type {
  Direction,
  GameMode,
  GameStatus,
  Obstacle,
  ObstacleKind,
  Point,
  PowerUp,
} from '../types';
import { initialSnake, randomFood, randomObstacleSpot } from '../utils/game';
import { Controls } from './Controls';
import { DPad } from './DPad';
import { GameCanvas } from './GameCanvas';
import { Leaderboard } from './Leaderboard';
import { NamePrompt } from './NamePrompt';
import { Scoreboard } from './Scoreboard';

export const SnakeGame: React.FC = () => {
  const { styles, themeName, palette } = useTheme();
  // ---------- Game state ----------
  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>(() => randomFood(initialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [mode, setMode] = useState<GameMode>('WRAP');
  const [score, setScore] = useState(0);
  const [speedMs, setSpeedMs] = useState(INITIAL_SPEED_MS);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  // While true: snake moves 50% faster and food is worth double points.
  const [boostActive, setBoostActive] = useState(false);

  const highScore = useHighScore(score);
  const { entries: leaderboard, qualifies, submit } = useLeaderboard();
  const playEatSound = useEatSound();
  const playSound = useSounds();

  // Score being prompted for; null means no prompt is open.
  const [pendingScore, setPendingScore] = useState<number | null>(null);

  // Track which game-over event we've already handled, so the prompt only
  // appears once per game.
  const handledGameOverRef = useRef(false);

  // Latest direction + queued direction inputs (so rapid taps don't get lost
  // or accidentally produce an illegal 180° reversal within one tick).
  const directionRef = useRef<Direction>(direction);
  directionRef.current = direction;
  const directionQueueRef = useRef<Direction[]>([]);

  // ---------- Actions ----------
  const resetGame = useCallback(() => {
    const s = initialSnake();
    setSnake(s);
    setFood(randomFood(s));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    setSpeedMs(INITIAL_SPEED_MS);
    setObstacles([]);
    setPowerUps([]);
    setBoostActive(false);
    handledGameOverRef.current = false;
  }, []);

  const handleStartPause = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'IDLE') return 'RUNNING';
      if (prev === 'RUNNING') return 'PAUSED';
      if (prev === 'PAUSED') return 'RUNNING';
      // GAME_OVER → reset and start
      resetGame();
      return 'RUNNING';
    });
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
    setStatus('RUNNING');
  }, [resetGame]);

  const handleToggleMode = useCallback(() => {
    setMode((m) => (m === 'CLASSIC' ? 'WRAP' : 'CLASSIC'));
  }, []);

  const queueDirection = useCallback((next: Direction) => {
    const queue = directionQueueRef.current;
    const lastQueued =
      queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    if (next === lastQueued) return;
    if (OPPOSITE[next] === lastQueued) return; // can't reverse into self
    queue.push(next);
  }, []);

  const autoStartFromInput = useCallback(() => {
    setStatus((prev) => (prev === 'IDLE' ? 'RUNNING' : prev));
  }, []);

  // ---------- Input ----------
  useKeyboardControls({
    status,
    onDirection: queueDirection,
    onStartPause: handleStartPause,
    onAutoStart: autoStartFromInput,
  });

  // ---------- Tick ----------
  const tick = useCallback(() => {
    setSnake((prevSnake) => {
      // Pull next valid direction from the input queue.
      const queue = directionQueueRef.current;
      let nextDir = directionRef.current;
      while (queue.length > 0) {
        const candidate = queue.shift()!;
        if (OPPOSITE[candidate] !== nextDir) {
          nextDir = candidate;
          break;
        }
      }
      if (nextDir !== directionRef.current) {
        directionRef.current = nextDir;
        setDirection(nextDir);
      }

      const v = DIR_VECTORS[nextDir];
      const head = prevSnake[0];
      let newX = head.x + v.x;
      let newY = head.y + v.y;

      // Wall behavior.
      if (mode === 'WRAP') {
        newX = (newX + GRID_COLS) % GRID_COLS;
        newY = (newY + GRID_ROWS) % GRID_ROWS;
      } else if (
        newX < 0 ||
        newX >= GRID_COLS ||
        newY < 0 ||
        newY >= GRID_ROWS
      ) {
        setStatus('GAME_OVER');
        return prevSnake;
      }

      const newHead: Point = { x: newX, y: newY };

      // Obstacle collision (Luis / SJ): game over.
      for (const ob of obstacles) {
        if (ob.x === newHead.x && ob.y === newHead.y) {
          setStatus('GAME_OVER');
          return prevSnake;
        }
      }

      // Power-up collision (Jen): activate the speed/score boost.
      const eatenPowerUp = powerUps.find(
        (p) => p.x === newHead.x && p.y === newHead.y,
      );
      if (eatenPowerUp) {
        setPowerUps((prev) => prev.filter((p) => p !== eatenPowerUp));
        setBoostActive(true);
        playSound('powerUp');
      }

      const ate = newHead.x === food.x && newHead.y === food.y;

      const newBody = ate
        ? [newHead, ...prevSnake]
        : [newHead, ...prevSnake.slice(0, -1)];

      // Self-collision (compare head against the rest of the body).
      for (let i = 1; i < newBody.length; i++) {
        if (newBody[i].x === newHead.x && newBody[i].y === newHead.y) {
          setStatus('GAME_OVER');
          return prevSnake;
        }
      }

      if (ate) {
        playEatSound();
        setScore((prev) => {
          const gained = boostActive ? 2 : 1;
          const next = prev + gained;
          if (
            next > 0 &&
            Math.floor(next / FOOD_PER_SPEEDUP) >
              Math.floor(prev / FOOD_PER_SPEEDUP)
          ) {
            setSpeedMs((s) => Math.max(MIN_SPEED_MS, s - SPEED_STEP_MS));
          }
          return next;
        });
        const nextFood = randomFood(newBody);
        setFood(nextFood);

        // 3/10 chance each to spawn Luis, SJ, and Jen on food eat.
        const rollLuis = Math.random() < 0.3;
        const rollSj = Math.random() < 0.3;
        const rollJen = Math.random() < 0.3;
        if (rollLuis || rollSj || rollJen) {
          const dir = directionRef.current;
          // Collect already-occupied obstacle/power-up cells so we don't
          // spawn on top of an existing one.
          const blocked: { x: number; y: number }[] = [
            ...obstacles,
            ...powerUps,
          ];
          const newObs: Obstacle[] = [];
          const newPus: PowerUp[] = [];
          const trySpawnObstacle = (kind: ObstacleKind) => {
            const spot = randomObstacleSpot(newBody, nextFood, dir, blocked);
            if (!spot) return;
            newObs.push({
              kind,
              x: spot.x,
              y: spot.y,
              expiresAt: Date.now() + 10_000,
            });
            blocked.push(spot);
            if (kind === 'LUIS') {
              console.warn('Luis has appeared. Don\u2019t eat him.');
            } else {
              console.warn('SJ has appeared. Don\u2019t eat him.');
            }
          };
          const trySpawnPowerUp = () => {
            const spot = randomObstacleSpot(newBody, nextFood, dir, blocked);
            if (!spot) return;
            newPus.push({
              kind: 'JEN',
              x: spot.x,
              y: spot.y,
              expiresAt: Date.now() + 10_000,
            });
            blocked.push(spot);
            console.warn('Power up Jen has appeared!');
          };
          if (rollLuis) trySpawnObstacle('LUIS');
          if (rollSj) trySpawnObstacle('SJ');
          if (rollJen) trySpawnPowerUp();
          if (newObs.length > 0) {
            setObstacles((prev) => [...prev, ...newObs]);
            playSound('obstacle');
          }
          if (newPus.length > 0) {
            setPowerUps((prev) => [...prev, ...newPus]);
          }
        }
      }

      return newBody;
    });
  }, [food, mode, obstacles, powerUps, boostActive, playEatSound, playSound]);

  // Effective tick rate: 1.5x faster while the Jen boost is active.
  const effectiveSpeed = boostActive
    ? Math.max(MIN_SPEED_MS, Math.round(speedMs / 1.5))
    : speedMs;
  useGameLoop(status === 'RUNNING', effectiveSpeed, tick);

  // Play start / game-over sounds on status transitions.
  const prevStatusRef = useRef<GameStatus>(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (status !== prev) {
      if (status === 'RUNNING' && prev !== 'PAUSED') {
        playSound('start');
      } else if (status === 'GAME_OVER') {
        playSound('gameOver');
      }
      prevStatusRef.current = status;
    }
  }, [status, playSound]);

  // Expire the speed/score boost after 20s.
  useEffect(() => {
    if (!boostActive) return;
    if (status !== 'RUNNING') return;
    const id = window.setTimeout(() => setBoostActive(false), 20_000);
    return () => window.clearTimeout(id);
  }, [boostActive, status]);

  // Expire obstacles after their 10s lifetime. Only runs while the game is
  // actively playing so paused/idle screens don't burn through them.
  useEffect(() => {
    if (status !== 'RUNNING') return;
    if (obstacles.length === 0 && powerUps.length === 0) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setObstacles((prev) => {
        const next = prev.filter((o) => o.expiresAt > now);
        return next.length === prev.length ? prev : next;
      });
      setPowerUps((prev) => {
        const next = prev.filter((p) => p.expiresAt > now);
        return next.length === prev.length ? prev : next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [status, obstacles.length, powerUps.length]);

  // On game over, prompt for a name if the score qualifies for the top 10.
  useEffect(() => {
    if (status !== 'GAME_OVER') return;
    if (handledGameOverRef.current) return;
    handledGameOverRef.current = true;
    if (!qualifies(score)) return;
    setPendingScore(score);
  }, [status, score, qualifies]);

  // ---------- Derived ----------
  const startPauseLabel = useMemo(() => {
    switch (status) {
      case 'IDLE':
        return 'Start';
      case 'RUNNING':
        return 'Pause';
      case 'PAUSED':
        return 'Resume';
      case 'GAME_OVER':
        return 'Play Again';
    }
  }, [status]);

  const handleDpadDirection = useCallback(
    (dir: Direction) => {
      autoStartFromInput();
      queueDirection(dir);
    },
    [autoStartFromInput, queueDirection],
  );

  // ---------- Render ----------
  return (
    <div style={styles.wrap}>
      <div style={styles.shell}>
        <div style={styles.brandBar}>
          <span style={styles.brand}>{palette.brandLabel}</span>
        </div>
        <div style={styles.screenBezel}>
          <Scoreboard score={score} highScore={highScore} mode={mode} />
          <div style={styles.canvasFrame}>
            <GameCanvas
              snake={snake}
              food={food}
              obstacles={obstacles}
              powerUps={powerUps}
              boostActive={boostActive}
              status={status}
              score={score}
              themeName={themeName}
              palette={palette}
            />
            {status === 'IDLE' && (
              <div style={styles.canvasLeaderboardOverlay}>
                <Leaderboard entries={leaderboard} />
              </div>
            )}
          </div>
        </div>
        <Controls
          startPauseLabel={startPauseLabel}
          mode={mode}
          onStartPause={handleStartPause}
          onRestart={handleRestart}
          onToggleMode={handleToggleMode}
        />
        <DPad onDirection={handleDpadDirection} onCenter={handleStartPause} />
        <div style={styles.footer}>
          Arrow keys / WASD • Space to pause • Eat 5 to speed up
        </div>
      </div>
      <aside style={styles.sidePanel}>
        <div style={styles.sidePanelTitle}>HIGH SCORES</div>
        <Leaderboard entries={leaderboard} />
      </aside>
      {pendingScore !== null && (
        <NamePrompt
          score={pendingScore}
          onSubmit={(name) => {
            submit(name, pendingScore);
            setPendingScore(null);
          }}
          onCancel={() => setPendingScore(null)}
        />
      )}
    </div>
  );
};

export default SnakeGame;
