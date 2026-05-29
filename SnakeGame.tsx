import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* ============================================================
 * Classic Snake (Nokia 3310 / Snake II style)
 * Single-file React + TypeScript component.
 * Styling: inline CSS (no Tailwind dependency required).
 * ============================================================ */

// ---------- Types ----------
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameMode = 'CLASSIC' | 'WRAP';
type GameStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'GAME_OVER';

// ---------- Constants ----------
const GRID_COLS = 20;
const GRID_ROWS = 20;
const CANVAS_PIXEL_SIZE = 400; // logical drawing size; CSS scales it responsively
const CELL_SIZE = CANVAS_PIXEL_SIZE / GRID_COLS;

const INITIAL_SPEED_MS = 160;
const MIN_SPEED_MS = 60;
const SPEED_STEP_MS = 10;
const FOOD_PER_SPEEDUP = 5;

const COLOR_BG = '#c7ceb2';
const COLOR_FG = '#2b2b2b';
const COLOR_BG_DIM = '#b6bea2'; // subtle grid shading
const HIGH_SCORE_KEY = 'snake_nokia_highscore_v1';

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const DIR_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// ---------- Helpers ----------
const initialSnake = (): Point[] => [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
];

const randomFood = (snake: Point[]): Point => {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const free: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
};

// ---------- Component ----------
const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>(() => randomFood(initialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [mode, setMode] = useState<GameMode>('WRAP');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speedMs, setSpeedMs] = useState(INITIAL_SPEED_MS);

  // Direction queue so rapid key presses within one tick are honored in order.
  const directionQueueRef = useRef<Direction[]>([]);
  const directionRef = useRef<Direction>(direction);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // ---------- Load high score ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) setHighScore(n);
      }
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  // ---------- Persist high score ----------
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [score, highScore]);

  // ---------- Reset / Start ----------
  const resetGame = useCallback(() => {
    const s = initialSnake();
    setSnake(s);
    setFood(randomFood(s));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    setSpeedMs(INITIAL_SPEED_MS);
  }, []);

  const handleStartPause = useCallback(() => {
    if (status === 'IDLE') {
      setStatus('RUNNING');
    } else if (status === 'RUNNING') {
      setStatus('PAUSED');
    } else if (status === 'PAUSED') {
      setStatus('RUNNING');
    } else if (status === 'GAME_OVER') {
      resetGame();
      setStatus('RUNNING');
    }
  }, [status, resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
    setStatus('RUNNING');
  }, [resetGame]);

  const handleToggleMode = useCallback(() => {
    setMode((m) => (m === 'CLASSIC' ? 'WRAP' : 'CLASSIC'));
  }, []);

  // ---------- Direction input ----------
  const queueDirection = useCallback((next: Direction) => {
    const queue = directionQueueRef.current;
    const lastQueued =
      queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    if (next === lastQueued) return;
    if (OPPOSITE[next] === lastQueued) return; // can't reverse
    queue.push(next);
  }, []);

  // Keyboard
  useEffect(() => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      w: 'UP',
      W: 'UP',
      s: 'DOWN',
      S: 'DOWN',
      a: 'LEFT',
      A: 'LEFT',
      d: 'RIGHT',
      D: 'RIGHT',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleStartPause();
        return;
      }
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        if (status === 'IDLE') setStatus('RUNNING');
        queueDirection(dir);
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queueDirection, handleStartPause, status]);

  // ---------- Game loop (setTimeout-based, speed-aware) ----------
  useEffect(() => {
    if (status !== 'RUNNING') return;

    let cancelled = false;
    let timer: number | undefined;

    const tick = () => {
      if (cancelled) return;

      setSnake((prevSnake) => {
        // Apply next queued direction (if any)
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

        // Wall handling
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
        const ate = newHead.x === food.x && newHead.y === food.y;

        // New body — drop tail unless eating.
        const newBody = ate
          ? [newHead, ...prevSnake]
          : [newHead, ...prevSnake.slice(0, -1)];

        // Self-collision (skip the tail tip if it just moved away)
        const bodyToCheck = ate ? newBody.slice(1) : newBody.slice(1);
        for (const seg of bodyToCheck) {
          if (seg.x === newHead.x && seg.y === newHead.y) {
            setStatus('GAME_OVER');
            return prevSnake;
          }
        }

        if (ate) {
          setScore((prev) => {
            const next = prev + 1;
            if (next > 0 && next % FOOD_PER_SPEEDUP === 0) {
              setSpeedMs((s) => Math.max(MIN_SPEED_MS, s - SPEED_STEP_MS));
            }
            return next;
          });
          setFood(randomFood(newBody));
        }

        return newBody;
      });

      timer = window.setTimeout(tick, speedMs);
    };

    timer = window.setTimeout(tick, speedMs);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [status, speedMs, mode, food]);

  // ---------- Rendering ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);

    // Faint grid dots for LCD feel
    ctx.fillStyle = COLOR_BG_DIM;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        ctx.fillRect(
          x * CELL_SIZE + CELL_SIZE / 2 - 1,
          y * CELL_SIZE + CELL_SIZE / 2 - 1,
          2,
          2,
        );
      }
    }

    // Border frame
    ctx.strokeStyle = COLOR_FG;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_PIXEL_SIZE - 2, CANVAS_PIXEL_SIZE - 2);

    // Helper: filled "pixel block" with inner gap for LCD aesthetic
    const drawBlock = (gx: number, gy: number) => {
      const pad = 1;
      ctx.fillStyle = COLOR_FG;
      ctx.fillRect(
        gx * CELL_SIZE + pad,
        gy * CELL_SIZE + pad,
        CELL_SIZE - pad * 2,
        CELL_SIZE - pad * 2,
      );
    };

    // Food (hollow square like Nokia food pellet)
    {
      const pad = 2;
      ctx.fillStyle = COLOR_FG;
      ctx.fillRect(
        food.x * CELL_SIZE + pad,
        food.y * CELL_SIZE + pad,
        CELL_SIZE - pad * 2,
        CELL_SIZE - pad * 2,
      );
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(
        food.x * CELL_SIZE + pad + 2,
        food.y * CELL_SIZE + pad + 2,
        CELL_SIZE - pad * 2 - 4,
        CELL_SIZE - pad * 2 - 4,
      );
    }

    // Snake
    snake.forEach((seg) => drawBlock(seg.x, seg.y));

    // Overlay text for non-running states
    if (status !== 'RUNNING') {
      ctx.fillStyle = 'rgba(43, 43, 43, 0.55)';
      ctx.fillRect(0, 0, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);

      ctx.fillStyle = COLOR_BG;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = CANVAS_PIXEL_SIZE / 2;
      const cy = CANVAS_PIXEL_SIZE / 2;

      ctx.font = 'bold 28px monospace';
      let title = '';
      let subtitle = '';
      if (status === 'IDLE') {
        title = 'SNAKE';
        subtitle = 'Press Start or any arrow';
      } else if (status === 'PAUSED') {
        title = 'PAUSED';
        subtitle = 'Press Space / Resume';
      } else if (status === 'GAME_OVER') {
        title = 'GAME OVER';
        subtitle = `Score ${score} • Tap Restart`;
      }
      ctx.fillText(title, cx, cy - 12);
      ctx.font = '12px monospace';
      ctx.fillText(subtitle, cx, cy + 16);
    }
  }, [snake, food, status, score]);

  // ---------- Derived UI ----------
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

  // ---------- Inline styles ----------
  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '16px',
      boxSizing: 'border-box',
      background: '#1f2421',
      color: COLOR_BG,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },
    shell: {
      width: '100%',
      maxWidth: 460,
      background: '#2f3a31',
      borderRadius: 24,
      padding: 16,
      boxShadow: '0 10px 30px rgba(0,0,0,0.45), inset 0 0 0 2px #4a5a48',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    },
    scoreboard: {
      background: COLOR_BG,
      color: COLOR_FG,
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 700,
      letterSpacing: 1,
      boxShadow: 'inset 0 0 0 2px #2b2b2b',
    },
    scoreItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    scoreLabel: { fontSize: 10, opacity: 0.7, letterSpacing: 2 },
    scoreValue: { fontSize: 20 },
    canvasFrame: {
      background: COLOR_BG,
      padding: 8,
      borderRadius: 10,
      boxShadow: 'inset 0 0 0 3px #2b2b2b',
      width: '100%',
      aspectRatio: '1 / 1',
      position: 'relative',
    },
    canvas: {
      width: '100%',
      height: '100%',
      display: 'block',
      imageRendering: 'pixelated',
    },
    controlsRow: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    btn: {
      flex: '1 1 120px',
      padding: '10px 14px',
      background: COLOR_BG,
      color: COLOR_FG,
      border: '2px solid #2b2b2b',
      borderRadius: 8,
      fontWeight: 700,
      letterSpacing: 1,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textTransform: 'uppercase',
    },
    btnGhost: {
      flex: '1 1 120px',
      padding: '10px 14px',
      background: 'transparent',
      color: COLOR_BG,
      border: '2px solid ' + COLOR_BG,
      borderRadius: 8,
      fontWeight: 700,
      letterSpacing: 1,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textTransform: 'uppercase',
    },
    dpadWrap: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 64px)',
      gridTemplateRows: 'repeat(3, 64px)',
      gap: 6,
      justifyContent: 'center',
      marginTop: 4,
      userSelect: 'none',
    },
    dpadBtn: {
      background: COLOR_BG,
      color: COLOR_FG,
      border: '2px solid #2b2b2b',
      borderRadius: 10,
      fontSize: 22,
      fontWeight: 900,
      cursor: 'pointer',
      touchAction: 'manipulation',
      fontFamily: 'inherit',
    },
    modeBadge: {
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 999,
      background: COLOR_FG,
      color: COLOR_BG,
      letterSpacing: 1,
    },
    footer: {
      fontSize: 11,
      opacity: 0.7,
      textAlign: 'center',
      marginTop: 8,
    },
  };

  // Prevent page scroll on touch dpad
  const onDpadTouch = (dir: Direction) => (e: React.TouchEvent) => {
    e.preventDefault();
    if (status === 'IDLE') setStatus('RUNNING');
    queueDirection(dir);
  };
  const onDpadClick = (dir: Direction) => () => {
    if (status === 'IDLE') setStatus('RUNNING');
    queueDirection(dir);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.shell}>
        {/* Scoreboard */}
        <div style={styles.scoreboard}>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>SCORE</span>
            <span style={styles.scoreValue}>
              {String(score).padStart(3, '0')}
            </span>
          </div>
          <div style={styles.scoreItem}>
            <span style={styles.modeBadge}>
              {mode === 'CLASSIC' ? 'CLASSIC' : 'WRAP'}
            </span>
          </div>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>HIGH</span>
            <span style={styles.scoreValue}>
              {String(highScore).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div style={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            width={CANVAS_PIXEL_SIZE}
            height={CANVAS_PIXEL_SIZE}
            style={styles.canvas}
            aria-label="Snake game canvas"
          />
        </div>

        {/* Top controls */}
        <div style={styles.controlsRow}>
          <button style={styles.btn} onClick={handleStartPause}>
            {startPauseLabel}
          </button>
          <button style={styles.btn} onClick={handleRestart}>
            Restart
          </button>
          <button style={styles.btnGhost} onClick={handleToggleMode}>
            Mode: {mode === 'CLASSIC' ? 'Classic' : 'Wrap'}
          </button>
        </div>

        {/* D-Pad */}
        <div style={styles.dpadWrap} aria-label="On-screen D-Pad">
          <span />
          <button
            style={styles.dpadBtn}
            onClick={onDpadClick('UP')}
            onTouchStart={onDpadTouch('UP')}
            aria-label="Up">
            ▲
          </button>
          <span />
          <button
            style={styles.dpadBtn}
            onClick={onDpadClick('LEFT')}
            onTouchStart={onDpadTouch('LEFT')}
            aria-label="Left">
            ◀
          </button>
          <button
            style={{
              ...styles.dpadBtn,
              background: '#2b2b2b',
              color: COLOR_BG,
            }}
            onClick={handleStartPause}
            aria-label="Start/Pause">
            ●
          </button>
          <button
            style={styles.dpadBtn}
            onClick={onDpadClick('RIGHT')}
            onTouchStart={onDpadTouch('RIGHT')}
            aria-label="Right">
            ▶
          </button>
          <span />
          <button
            style={styles.dpadBtn}
            onClick={onDpadClick('DOWN')}
            onTouchStart={onDpadTouch('DOWN')}
            aria-label="Down">
            ▼
          </button>
          <span />
        </div>

        <div style={styles.footer}>
          Arrow keys / WASD • Space to pause • Eat 5 to speed up
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
