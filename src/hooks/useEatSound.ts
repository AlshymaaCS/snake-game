import { useCallback, useEffect, useRef } from 'react';

/**
 * Tiny Web Audio "chirp" used as the snake's eating sound. No asset needed:
 * we synthesize a short square-wave blip with a quick pitch sweep so it has a
 * cheerful 8-bit feel that fits the Nokia aesthetic.
 */
export function useEatSound(): () => void {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  return useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      if (!ctxRef.current) ctxRef.current = new Ctor();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      // Master bus with a tiny limiter-ish curve so layered voices don't clip.
      const master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);

      // 1) Ascending arpeggio "yum!" — C5, E5, G5, C6 in quick succession.
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const t = now + i * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        // Slight pitch bend up for sparkle.
        osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.07);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 0.1);
      });

      // 2) Sub-octave "thump" for body.
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(180, now);
      sub.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.35, now + 0.005);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      sub.connect(subGain).connect(master);
      sub.start(now);
      sub.stop(now + 0.2);

      // 3) Noise burst "crunch" at the very start.
      const noiseDur = 0.06;
      const buffer = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * noiseDur),
        ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // Fade noise out over its duration.
        const env = 1 - i / data.length;
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1800;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.22;
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start(now);
      noise.stop(now + noiseDur);

      // 4) Final sparkle ping after the arpeggio resolves.
      const sparkleT = now + 0.22;
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(1568, sparkleT); // G6
      sparkle.frequency.exponentialRampToValueAtTime(2093, sparkleT + 0.08); // C7
      sparkleGain.gain.setValueAtTime(0.0001, sparkleT);
      sparkleGain.gain.exponentialRampToValueAtTime(0.22, sparkleT + 0.01);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, sparkleT + 0.14);
      sparkle.connect(sparkleGain).connect(master);
      sparkle.start(sparkleT);
      sparkle.stop(sparkleT + 0.16);
    } catch {
      // Audio is non-essential — silently ignore failures.
    }
  }, []);
}
