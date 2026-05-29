import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Tiny Web Audio sound bank for the snake game. All sounds are synthesized
 * on the fly so we don't ship any audio assets. Each sound has its own
 * character so the player can tell events apart by ear:
 *
 *  - eat:      bright ascending "yum!" arpeggio + sub thump + sparkle
 *  - powerUp:  rising magical shimmer (sine + detuned saw, long sparkle tail)
 *  - obstacle: short ominous descending growl (sawtooth + noise hit)
 *  - gameOver: 4-note descending minor "trombone fall"
 *  - start:    cheerful 3-note major fanfare
 */
export type SoundName = 'eat' | 'powerUp' | 'obstacle' | 'gameOver' | 'start';

export function useSounds(): (name: SoundName) => void {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  const getCtx = useCallback((): AudioContext | null => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      if (!ctxRef.current) ctxRef.current = new Ctor();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const players = useMemo(
    () => ({
      eat(ctx: AudioContext) {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);

        // Ascending arpeggio C5, E5, G5, C6.
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const t = now + i * 0.045;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.07);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
          osc.connect(gain).connect(master);
          osc.start(t);
          osc.stop(t + 0.1);
        });

        // Sub thump.
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

        // Final sparkle ping.
        const sparkleT = now + 0.22;
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(1568, sparkleT);
        sparkle.frequency.exponentialRampToValueAtTime(2093, sparkleT + 0.08);
        sparkleGain.gain.setValueAtTime(0.0001, sparkleT);
        sparkleGain.gain.exponentialRampToValueAtTime(0.22, sparkleT + 0.01);
        sparkleGain.gain.exponentialRampToValueAtTime(0.0001, sparkleT + 0.14);
        sparkle.connect(sparkleGain).connect(master);
        sparkle.start(sparkleT);
        sparkle.stop(sparkleT + 0.16);
      },

      powerUp(ctx: AudioContext) {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.3;
        master.connect(ctx.destination);

        // Rising shimmer: sine + slightly detuned saw sweeping up an octave+.
        const dur = 0.6;
        const baseFreq = 440;
        const topFreq = 1760; // two octaves up
        const sine = ctx.createOscillator();
        const saw = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sine.type = 'sine';
        saw.type = 'sawtooth';
        sine.frequency.setValueAtTime(baseFreq, now);
        saw.frequency.setValueAtTime(baseFreq * 1.005, now);
        sine.frequency.exponentialRampToValueAtTime(topFreq, now + dur);
        saw.frequency.exponentialRampToValueAtTime(topFreq * 1.005, now + dur);
        sweepGain.gain.setValueAtTime(0.0001, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
        sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        sine.connect(sweepGain);
        saw.connect(sweepGain);
        sweepGain.connect(master);
        sine.start(now);
        saw.start(now);
        sine.stop(now + dur + 0.05);
        saw.stop(now + dur + 0.05);

        // Two sparkle bells at the peak.
        [0.35, 0.45].forEach((delay, i) => {
          const t = now + delay;
          const bell = ctx.createOscillator();
          const bg = ctx.createGain();
          bell.type = 'triangle';
          bell.frequency.setValueAtTime(i === 0 ? 2093 : 2637, t); // C7, E7
          bg.gain.setValueAtTime(0.0001, t);
          bg.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
          bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          bell.connect(bg).connect(master);
          bell.start(t);
          bell.stop(t + 0.32);
        });
      },

      obstacle(ctx: AudioContext) {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.3;
        master.connect(ctx.destination);

        // Ominous descending growl.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + 0.42);

        // Low-passed noise hit for a thud.
        const noiseDur = 0.18;
        const buffer = ctx.createBuffer(
          1,
          Math.floor(ctx.sampleRate * noiseDur),
          ctx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = 1 - i / data.length;
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        const ng = ctx.createGain();
        ng.gain.value = 0.4;
        noise.connect(lp).connect(ng).connect(master);
        noise.start(now);
        noise.stop(now + noiseDur);
      },

      gameOver(ctx: AudioContext) {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);

        // Descending minor "trombone" — A4, F4, D4, A3.
        const notes = [440, 349.23, 293.66, 220];
        notes.forEach((freq, i) => {
          const t = now + i * 0.18;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          // Slight downward bend so each note "sags".
          osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.17);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
          osc.connect(gain).connect(master);
          osc.start(t);
          osc.stop(t + 0.22);
        });

        // Final low sub thud.
        const subT = now + notes.length * 0.18;
        const sub = ctx.createOscillator();
        const sg = ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(110, subT);
        sub.frequency.exponentialRampToValueAtTime(55, subT + 0.35);
        sg.gain.setValueAtTime(0.0001, subT);
        sg.gain.exponentialRampToValueAtTime(0.4, subT + 0.01);
        sg.gain.exponentialRampToValueAtTime(0.0001, subT + 0.45);
        sub.connect(sg).connect(master);
        sub.start(subT);
        sub.stop(subT + 0.5);
      },

      start(ctx: AudioContext) {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);

        // Cheerful 3-note fanfare: G5, C6, E6.
        const notes = [783.99, 1046.5, 1318.51];
        notes.forEach((freq, i) => {
          const t = now + i * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          osc.connect(gain).connect(master);
          osc.start(t);
          osc.stop(t + 0.16);
        });

        // Sparkle chime on top of the final note.
        const chimeT = now + 0.16;
        const chime = ctx.createOscillator();
        const cg = ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(2637, chimeT); // E7
        cg.gain.setValueAtTime(0.0001, chimeT);
        cg.gain.exponentialRampToValueAtTime(0.25, chimeT + 0.01);
        cg.gain.exponentialRampToValueAtTime(0.0001, chimeT + 0.3);
        chime.connect(cg).connect(master);
        chime.start(chimeT);
        chime.stop(chimeT + 0.32);
      },
    }),
    [],
  );

  return useCallback(
    (name: SoundName) => {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        players[name](ctx);
      } catch {
        // Audio is non-essential — silently ignore failures.
      }
    },
    [getCtx, players],
  );
}
