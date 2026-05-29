import React, { useEffect, useMemo, useRef } from 'react';
import jenUrl from '../assets/jen.svg';
import luisUrl from '../assets/luis.svg';
import sjUrl from '../assets/sj.svg';
import {
  CANVAS_PIXEL_SIZE,
  CELL_SIZE,
  COLOR_BG,
  COLOR_BG_DIM,
  COLOR_FG,
  GRID_COLS,
  GRID_ROWS,
} from '../constants';
import { styles } from '../styles';
import type { GameStatus, Obstacle, Point, PowerUp } from '../types';

interface Props {
  snake: Point[];
  food: Point;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  boostActive: boolean;
  status: GameStatus;
  score: number;
}

export const GameCanvas: React.FC<Props> = ({
  snake,
  food,
  obstacles,
  powerUps,
  boostActive,
  status,
  score,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload the obstacle / power-up sprites once.
  const sprites = useMemo(() => {
    const luis = new Image();
    luis.src = luisUrl;
    const sj = new Image();
    sj.src = sjUrl;
    const jen = new Image();
    jen.src = jenUrl;
    return { LUIS: luis, SJ: sj, JEN: jen };
  }, []);

  // Keep refs to the latest props so the rAF loop always reads fresh values.
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const obstaclesRef = useRef(obstacles);
  const powerUpsRef = useRef(powerUps);
  const boostRef = useRef(boostActive);
  const statusRef = useRef(status);
  const scoreRef = useRef(score);
  snakeRef.current = snake;
  foodRef.current = food;
  obstaclesRef.current = obstacles;
  powerUpsRef.current = powerUps;
  boostRef.current = boostActive;
  statusRef.current = status;
  scoreRef.current = score;

  // Remember when this food first appeared so we can do a "spawn pop".
  const foodSpawnRef = useRef<number>(performance.now());
  const lastFoodRef = useRef<Point>(food);
  if (lastFoodRef.current !== food) {
    lastFoodRef.current = food;
    foodSpawnRef.current = performance.now();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const dirBetween = (from: Point, to: Point): { x: number; y: number } => {
      const wrap = (d: number, size: number) => {
        if (d > size / 2) return d - size;
        if (d < -size / 2) return d + size;
        return d;
      };
      const dx = wrap(to.x - from.x, GRID_COLS);
      const dy = wrap(to.y - from.y, GRID_ROWS);
      return { x: Math.sign(dx), y: Math.sign(dy) };
    };

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

    // ----- Animated food: rotating diamond ring with a pulsing core and a
    // sparkle, plus a brief scale-up "pop" when it first appears.
    const drawFood = (now: number) => {
      const f = foodRef.current;
      const cx = f.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = f.y * CELL_SIZE + CELL_SIZE / 2;

      // Spawn pop: 1.4x -> 1.0 over ~220ms.
      const spawnDt = now - foodSpawnRef.current;
      const popK = Math.max(0, 1 - spawnDt / 220);
      const popScale = 1 + 0.4 * popK * popK;

      // Continuous pulse (~1.2Hz).
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.0075);

      // Rotation.
      const angle = (now * 0.0015) % (Math.PI * 2);

      const baseR = (CELL_SIZE / 2 - 2) * popScale;
      const outerR = baseR * (0.92 + 0.08 * pulse);
      const innerR = baseR * (0.38 + 0.18 * pulse);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Outer rotating diamond.
      ctx.fillStyle = COLOR_FG;
      ctx.beginPath();
      ctx.moveTo(0, -outerR);
      ctx.lineTo(outerR, 0);
      ctx.lineTo(0, outerR);
      ctx.lineTo(-outerR, 0);
      ctx.closePath();
      ctx.fill();

      // Hollow center, so it reads as a ring.
      const holeR = outerR * 0.55;
      ctx.fillStyle = COLOR_BG;
      ctx.beginPath();
      ctx.moveTo(0, -holeR);
      ctx.lineTo(holeR, 0);
      ctx.lineTo(0, holeR);
      ctx.lineTo(-holeR, 0);
      ctx.closePath();
      ctx.fill();

      // Pulsing solid core.
      ctx.fillStyle = COLOR_FG;
      ctx.beginPath();
      ctx.moveTo(0, -innerR);
      ctx.lineTo(innerR, 0);
      ctx.lineTo(0, innerR);
      ctx.lineTo(-innerR, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Sparkle: small dot orbiting just outside the food.
      const sparkleAngle = -angle * 1.7;
      const sparkleR = baseR + 3;
      const sx = cx + Math.cos(sparkleAngle) * sparkleR;
      const sy = cy + Math.sin(sparkleAngle) * sparkleR;
      const sparkleSize = 1.5 + 1.5 * pulse;
      ctx.fillStyle = COLOR_FG;
      ctx.fillRect(
        sx - sparkleSize / 2,
        sy - sparkleSize / 2,
        sparkleSize,
        sparkleSize,
      );
    };

    const drawFrame = (now: number) => {
      const snk = snakeRef.current;
      const st = statusRef.current;
      const sc = scoreRef.current;

      // LCD background
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);

      // Subtle pixel-grid dots
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

      // Frame
      ctx.strokeStyle = COLOR_FG;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, CANVAS_PIXEL_SIZE - 2, CANVAS_PIXEL_SIZE - 2);

      drawFood(now);

      // Obstacles (Luis / SJ) + Power-ups (Jen): draw the SVG sprite ~1.7x
      // cell size centered on the cell, a flashing outline in the final 3s
      // before expiry, and a speech bubble for the first 3s after spawn.
      const obSize = CELL_SIZE * 1.7;
      const obOffset = (obSize - CELL_SIZE) / 2;
      type Sprite = {
        kind: 'LUIS' | 'SJ' | 'JEN';
        x: number;
        y: number;
        expiresAt: number;
        bubble: string;
      };
      const sprList: Sprite[] = [
        ...obstaclesRef.current.map((o) => ({
          kind: o.kind as Sprite['kind'],
          x: o.x,
          y: o.y,
          expiresAt: o.expiresAt,
          bubble: o.kind === 'LUIS' ? "I'm Luis" : "I'm SJ",
        })),
        ...powerUpsRef.current.map((p) => ({
          kind: p.kind as Sprite['kind'],
          x: p.x,
          y: p.y,
          expiresAt: p.expiresAt,
          bubble: 'Power up Jen has appeared!',
        })),
      ];
      for (const ob of sprList) {
        const img = sprites[ob.kind];
        const cellX = ob.x * CELL_SIZE;
        const cellY = ob.y * CELL_SIZE;
        const drawX = cellX - obOffset;
        const drawY = cellY - obOffset;
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, drawX, drawY, obSize, obSize);
        } else {
          ctx.fillStyle = COLOR_FG;
          ctx.fillRect(cellX + 1, cellY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
        const remaining = ob.expiresAt - Date.now();
        if (remaining < 3000) {
          const flash = Math.sin(now * 0.02) > 0;
          if (flash) {
            ctx.strokeStyle = COLOR_FG;
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX + 0.5, drawY + 0.5, obSize - 1, obSize - 1);
          }
        }

        // Speech bubble for the first 3 seconds after spawn.
        const ageMs = Date.now() - (ob.expiresAt - 10_000);
        if (ageMs >= 0 && ageMs < 3000) {
          const text = ob.bubble;
          ctx.font = 'bold 11px monospace';
          const textW = ctx.measureText(text).width;
          const padX = 5;
          const bubbleW = Math.ceil(textW + padX * 2);
          const bubbleH = 16;
          const tailH = 4;

          const obCx = cellX + CELL_SIZE / 2;
          let bubbleX = obCx - bubbleW / 2;
          bubbleX = Math.max(
            2,
            Math.min(CANVAS_PIXEL_SIZE - bubbleW - 2, bubbleX),
          );
          const above = drawY - bubbleH - tailH >= 2;
          const bubbleY = above
            ? drawY - bubbleH - tailH
            : drawY + obSize + tailH;

          ctx.fillStyle = COLOR_BG;
          ctx.strokeStyle = COLOR_FG;
          ctx.lineWidth = 1;
          ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
          ctx.strokeRect(
            bubbleX + 0.5,
            bubbleY + 0.5,
            bubbleW - 1,
            bubbleH - 1,
          );

          const tailCx = Math.max(
            bubbleX + 4,
            Math.min(bubbleX + bubbleW - 4, obCx),
          );
          ctx.beginPath();
          if (above) {
            ctx.moveTo(tailCx - 3, bubbleY + bubbleH);
            ctx.lineTo(tailCx + 3, bubbleY + bubbleH);
            ctx.lineTo(tailCx, bubbleY + bubbleH + tailH);
          } else {
            ctx.moveTo(tailCx - 3, bubbleY);
            ctx.lineTo(tailCx + 3, bubbleY);
            ctx.lineTo(tailCx, bubbleY - tailH);
          }
          ctx.closePath();
          ctx.fillStyle = COLOR_BG;
          ctx.fill();
          ctx.strokeStyle = COLOR_FG;
          ctx.stroke();

          ctx.fillStyle = COLOR_FG;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            text,
            bubbleX + bubbleW / 2,
            bubbleY + bubbleH / 2 + 0.5,
          );
        }
      }

      // Body (skip head/tail; drawn specially below).
      snk.forEach((seg, i) => {
        if (i === 0 || i === snk.length - 1) return;
        drawBlock(seg.x, seg.y);
      });

      // Tail: smaller block, nudged toward the segment in front.
      if (snk.length >= 2) {
        const tail = snk[snk.length - 1];
        const ahead = snk[snk.length - 2];
        const d = dirBetween(tail, ahead);
        const pad = 3;
        const size = CELL_SIZE - pad * 2;
        const offset = 2;
        ctx.fillStyle = COLOR_FG;
        ctx.fillRect(
          tail.x * CELL_SIZE + pad + d.x * offset,
          tail.y * CELL_SIZE + pad + d.y * offset,
          size,
          size,
        );
      }

      // Head: full block with two "eyes" on the leading edge.
      if (snk.length >= 1) {
        const head = snk[0];
        drawBlock(head.x, head.y);

        let face = { x: 1, y: 0 };
        if (snk.length >= 2) face = dirBetween(snk[1], head);

        const hcx = head.x * CELL_SIZE + CELL_SIZE / 2;
        const hcy = head.y * CELL_SIZE + CELL_SIZE / 2;
        const eyeSize = Math.max(2, Math.floor(CELL_SIZE / 6));
        const forward = CELL_SIZE / 2 - eyeSize - 1;
        const side = CELL_SIZE / 5;
        const perp = { x: -face.y, y: face.x };

        const drawEye = (sign: 1 | -1) => {
          const ex =
            hcx + face.x * forward + perp.x * side * sign - eyeSize / 2;
          const ey =
            hcy + face.y * forward + perp.y * side * sign - eyeSize / 2;
          ctx.fillStyle = COLOR_BG;
          ctx.fillRect(ex, ey, eyeSize, eyeSize);
        };
        drawEye(1);
        drawEye(-1);
      }

      // State overlays
      if (st !== 'RUNNING') {
        ctx.fillStyle = 'rgba(26, 29, 20, 0.55)';
        ctx.fillRect(0, 0, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);

        ctx.fillStyle = COLOR_BG;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const ocx = CANVAS_PIXEL_SIZE / 2;
        const ocy = CANVAS_PIXEL_SIZE / 2;

        let title = '';
        let subtitle = '';
        if (st === 'IDLE') {
          title = 'SNAKE';
          subtitle = 'Press Start or any arrow';
        } else if (st === 'PAUSED') {
          title = 'PAUSED';
          subtitle = 'Press Space to resume';
        } else if (st === 'GAME_OVER') {
          title = 'GAME OVER';
          subtitle = `Score ${sc} • Tap Restart`;
        }

        ctx.font = 'bold 28px monospace';
        ctx.fillText(title, ocx, ocy - 12);
        ctx.font = '12px monospace';
        ctx.fillText(subtitle, ocx, ocy + 16);
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div style={styles.canvasFrame}>
      <canvas
        ref={canvasRef}
        width={CANVAS_PIXEL_SIZE}
        height={CANVAS_PIXEL_SIZE}
        style={styles.canvas}
        aria-label="Snake game canvas"
      />
    </div>
  );
};
