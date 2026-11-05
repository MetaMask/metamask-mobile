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
export const MARQUEE_BRAKE_RATE = 10;
export const MARQUEE_ACCELERATE_RATE = 2;
