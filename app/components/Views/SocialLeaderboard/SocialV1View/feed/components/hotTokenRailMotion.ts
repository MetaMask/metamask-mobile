import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** The rail's left inset. A selected chip docks here. */
export const DOCK_LEFT = 16;

/** The close icon's slot: a 4px lead plus the 16px icon. */
export const CLOSE_SLOT_WIDTH = 20;

/** Pills this far past the viewport still count as on screen. */
export const ON_SCREEN_MARGIN = 40;

/** Pills slide away from the pressed one, nearest first, as they fade. */
export const DISPERSE = {
  duration: 220,
  delayPerPixel: 0.12,
  maxDelay: 100,
  shiftX: 18,
  shiftY: 4,
  scale: 0.86,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

/** Pills rise back in, left to right across the viewport. */
export const REASSEMBLE = {
  duration: 300,
  baseDelay: 0,
  spreadDelay: 140,
  shiftY: 8,
  scale: 0.92,
  easing: Easing.bezier(0.2, 0.9, 0.25, 1),
};

/** Low-end hardware fades the pills without the stagger or the motion. */
export const LIGHT_FADE_DURATION = 150;

/** The selected chip's flight to the dock, with a touch of overshoot. */
export const FLY_SPRING: WithSpringConfig = {
  stiffness: 420,
  damping: 30,
  mass: 1,
};

/** The selected chip takes its fill while it flies. */
export const SELECTED_FILL = {
  duration: 180,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/** The close icon slides open alongside the flight. */
export const CLOSE_SLOT = {
  duration: 240,
  easing: Easing.bezier(0.2, 0.9, 0.3, 1),
};

/** The docked chip drops back and fades when the filter clears. */
export const DOCK_EXIT = {
  duration: 160,
  shiftX: -10,
  scale: 0.9,
  easing: Easing.bezier(0.4, 0, 1, 1),
};

/**
 * Marquee speed eases toward its target: it brakes quickly when a chip is
 * selected and picks back up gently when the filter clears.
 */
const MARQUEE_BRAKE_RATE = 10;
const MARQUEE_ACCELERATE_RATE = 2;

/** Below this, a braking marquee counts as stopped. */
const MARQUEE_STOP_SPEED = 0.05;

/** Keeps the marquee offset within one track width. */
export const wrapOffset = (x: number, width: number): number => {
  'worklet';
  if (width <= 0) {
    return 0;
  }
  const wrapped = x % width;
  return wrapped < 0 ? wrapped + width : wrapped;
};

/** The marquee's next speed after `dtSeconds`, easing toward `target`. */
export const stepMarqueeSpeed = (
  speed: number,
  target: number,
  dtSeconds: number,
): number => {
  'worklet';
  const rate = target < speed ? MARQUEE_BRAKE_RATE : MARQUEE_ACCELERATE_RATE;
  const next = speed + (target - speed) * (1 - Math.exp(-dtSeconds * rate));
  return target === 0 && next < MARQUEE_STOP_SPEED ? 0 : next;
};

/** Longest frame gap the marquee steps over, so a stall does not jump it. */
const MARQUEE_MAX_STEP_SECONDS = 0.05;

/**
 * One marquee frame. A track that fits the viewport stays put; otherwise the
 * speed eases toward `target` and the offset wraps within the track.
 */
export const advanceMarquee = (
  offset: number,
  speed: number,
  target: number,
  frameMs: number,
  trackWidth: number,
  viewportWidth: number,
): { offset: number; speed: number } => {
  'worklet';
  if (
    frameMs <= 0 ||
    trackWidth <= 0 ||
    viewportWidth <= 0 ||
    trackWidth <= viewportWidth
  ) {
    return { offset, speed };
  }
  const dt = Math.min(frameMs / 1000, MARQUEE_MAX_STEP_SECONDS);
  const nextSpeed = stepMarqueeSpeed(speed, target, dt);
  return {
    offset: wrapOffset(offset + nextSpeed * dt, trackWidth),
    speed: nextSpeed,
  };
};

export const isPillOnScreen = (
  left: number,
  width: number,
  viewportWidth: number,
): boolean =>
  left + width > -ON_SCREEN_MARGIN && left < viewportWidth + ON_SCREEN_MARGIN;

/** How a pill scatters: away from the pressed pill, later the farther it is. */
export const getDisperseMotion = (
  pillCenter: number,
  originCenter: number,
): { delay: number; shiftX: number } => {
  const distance = pillCenter - originCenter;
  return {
    delay: Math.min(
      Math.abs(distance) * DISPERSE.delayPerPixel,
      DISPERSE.maxDelay,
    ),
    shiftX: (distance < 0 ? -1 : 1) * DISPERSE.shiftX,
  };
};

/** Pills return left to right, so the delay grows across the viewport. */
export const getReassembleDelay = (
  left: number,
  viewportWidth: number,
): number =>
  REASSEMBLE.baseDelay +
  (viewportWidth > 0 ? Math.max(0, left / viewportWidth) : 0) *
    REASSEMBLE.spreadDelay;
