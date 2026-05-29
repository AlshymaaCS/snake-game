import { useEffect, useRef } from 'react';

/**
 * Drives a fixed-interval game tick using setTimeout, so the interval can
 * change mid-game (speed-up system). The callback ref is always fresh.
 */
export function useGameLoop(
  active: boolean,
  intervalMs: number,
  onTick: () => void,
): void {
  const callbackRef = useRef(onTick);

  useEffect(() => {
    callbackRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: number | undefined;

    const loop = () => {
      if (cancelled) return;
      callbackRef.current();
      timer = window.setTimeout(loop, intervalMs);
    };

    timer = window.setTimeout(loop, intervalMs);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [active, intervalMs]);
}
