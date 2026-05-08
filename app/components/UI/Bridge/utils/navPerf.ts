// DEMO-ONLY: navigation performance overlay utilities.
// Used to showcase JS-stack vs native-stack performance for the Bridge feature.
// Remove all imports/usages of this file before merging to main.

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export interface NavPerfSample {
  label: string;
  ms: number;
  at: number;
}

const starts = new Map<string, number>();
let samples: NavPerfSample[] = [];
const listeners = new Set<() => void>();

const MAX_SAMPLES = 8;

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Record the start of a navigation transition. Call this immediately before
 * `navigation.navigate(...)` or `navigation.goBack()` for the screen you want
 * to time.
 */
export function markNavStart(label: string): void {
  starts.set(label, Date.now());
}

/**
 * Records the end of a navigation transition for `label` when the screen comes
 * into focus. Internally uses `useFocusEffect` so it fires on initial push and
 * on every re-focus (e.g. coming back from a child screen).
 */
export function useMarkNavEnd(label: string): void {
  const onFocus = useCallback(() => {
    const start = starts.get(label);
    if (start == null) return;
    starts.delete(label);
    const ms = Date.now() - start;
    samples = [{ label, ms, at: Date.now() }, ...samples].slice(0, MAX_SAMPLES);
    notify();
  }, [label]);

  useFocusEffect(onFocus);
}

/** Subscribe to the latest navigation samples for the overlay. */
export function useNavPerfSamples(): NavPerfSample[] {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return samples;
}

/**
 * JS-thread frame rate sampled via requestAnimationFrame. When the JS thread
 * is busy (e.g. driving a stack-navigator transition in JS), this number drops.
 * Native-stack transitions stay close to display refresh because animations
 * run on the UI thread.
 */
export function useJsFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = Date.now();
    let raf: number;
    const tick = () => {
      frames++;
      const now = Date.now();
      const elapsed = now - last;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}
