import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** The rail's left inset, matching the 8px gap between chips. A selected chip docks here. */
export const DOCK_LEFT = 8;

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
 * UIScrollView.DecelerationRate.normal. A flick keeps its release speed and
 * eases to rest instead of stopping with the finger.
 */
export const RAIL_DRIFT_DECELERATION = 0.998;

/**
 * Coasts shorter than about a pill's padding resume the crawl directly.
 * Points per second.
 */
export const RAIL_DRIFT_MIN_VELOCITY = 30;

/**
 * Laps added before the native modulo. A reverse coast drives the offset
 * negative, and the new-architecture modulo keeps that sign, which opens a
 * gap ahead of the first pill. This headroom keeps a real flick positive.
 */
export const RAIL_DRIFT_WRAP_LAPS = 64;

/**
 * Where a coast sits after `elapsedMs`, before wrapping.
 *
 * React Native's decay animation uses the UIScrollView curve with time in
 * milliseconds and velocity in pixels per millisecond.
 */
export const driftOffset = (
  origin: number,
  velocity: number,
  elapsedMs: number,
): number => {
  const rate = 1 - RAIL_DRIFT_DECELERATION;
  return origin + (velocity / rate) * (1 - Math.exp(-rate * elapsedMs));
};

/** Keeps the marquee offset within one track width. */
export const wrapOffset = (x: number, width: number): number => {
  'worklet';
  if (width <= 0) {
    return 0;
  }
  const wrapped = x % width;
  return wrapped < 0 ? wrapped + width : wrapped;
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
