import { useEffect, useRef, useState } from 'react';

import { COUNT_UP_FRAME_MS } from './graduationProgress.constants';

export const createCubicBezierEasing =
  (x1: number, y1: number, x2: number, y2: number): ((t: number) => number) =>
  (t: number): number => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    let low = 0;
    let high = 1;
    let param = t;
    for (let i = 0; i < 12; i += 1) {
      const x =
        3 * param * (1 - param) ** 2 * x1 +
        3 * param * param * (1 - param) * x2 +
        param ** 3;
      if (Math.abs(x - t) < 1e-5) {
        break;
      }
      if (x < t) {
        low = param;
      } else {
        high = param;
      }
      param = (low + high) / 2;
    }
    return (
      3 * param * (1 - param) ** 2 * y1 +
      3 * param * param * (1 - param) * y2 +
      param ** 3
    );
  };

export interface UseCountUpOptions {
  mountDurationMs: number;
  deltaDurationMs: number;
  frameMs?: number;
  reducedMotion: boolean;
  easing: (t: number) => number;
}

export const useCountUp = (
  target: number,
  options: UseCountUpOptions,
): number => {
  const {
    mountDurationMs,
    deltaDurationMs,
    frameMs = COUNT_UP_FRAME_MS,
    reducedMotion,
    easing,
  } = options;
  const [displayed, setDisplayed] = useState(reducedMotion ? target : 0);
  const fromRef = useRef(reducedMotion ? target : 0);
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (reducedMotion) {
      fromRef.current = target;
      setDisplayed(target);
      return undefined;
    }
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) {
      return undefined;
    }
    const duration = isFirstRunRef.current ? mountDurationMs : deltaDurationMs;
    isFirstRunRef.current = false;
    const frames = Math.max(1, Math.ceil(duration / frameMs));
    let frame = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const step = (): void => {
      frame += 1;
      const t = Math.min(1, frame / frames);
      const value = Math.round(from + delta * easing(t));
      fromRef.current = value;
      setDisplayed(value);
      if (frame < frames) {
        timeoutId = setTimeout(step, frameMs);
      }
    };
    timeoutId = setTimeout(step, frameMs);
    return (): void => clearTimeout(timeoutId);
  }, [
    target,
    mountDurationMs,
    deltaDurationMs,
    frameMs,
    reducedMotion,
    easing,
  ]);

  return displayed;
};
