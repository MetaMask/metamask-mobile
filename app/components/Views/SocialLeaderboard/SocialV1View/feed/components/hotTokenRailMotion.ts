import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** The rail's left inset. A selected chip docks here. */
export const DOCK_LEFT = 16;

/** The close icon's slot: a 4px lead plus the 16px icon. */
export const CLOSE_SLOT_WIDTH = 20;

/** Pills this far past the viewport still count as on screen. */
export const ON_SCREEN_MARGIN = 40;

/** Pills slide away from the pressed one, nearest first, as they fade. */
export const DISPERSE = {
  duration: 440,
  delayPerPixel: 0.32,
  maxDelay: 280,
  shiftX: 22,
  shiftY: 4,
  scale: 0.84,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

/** Pills rise back in, left to right across the viewport. */
export const REASSEMBLE = {
  duration: 560,
  baseDelay: 120,
  spreadDelay: 340,
  shiftY: 10,
  scale: 0.9,
  easing: Easing.bezier(0.2, 0.9, 0.25, 1),
};

/** Low-end hardware fades the pills without the stagger or the motion. */
export const LIGHT_FADE_DURATION = 200;

/** The selected chip's flight to the dock, with a touch of overshoot. */
export const FLY_SPRING: WithSpringConfig = {
  stiffness: 210,
  damping: 21,
  mass: 1,
};

/** The selected chip takes its fill while it flies. */
export const SELECTED_FILL = {
  duration: 350,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/** The close icon slides open once the chip lands. */
export const CLOSE_SLOT = {
  duration: 450,
  easing: Easing.bezier(0.2, 0.9, 0.3, 1),
};

/** The docked chip drops back and fades when the filter clears. */
export const DOCK_EXIT = {
  delay: 80,
  duration: 320,
  shiftX: -12,
  scale: 0.88,
  easing: Easing.bezier(0.4, 0, 1, 1),
};

/**
 * Marquee speed eases toward its target: it brakes quickly when a chip is
 * selected and picks back up gently when the filter clears.
 */
export const MARQUEE_BRAKE_RATE = 7;
export const MARQUEE_ACCELERATE_RATE = 1.6;
