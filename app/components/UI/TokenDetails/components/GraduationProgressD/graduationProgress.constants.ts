export const GRADUATION_CELL_COUNT = 10;

export const GRADUATION_CELL_HEIGHT_DP = 12;

export const GRADUATION_CELL_GAP_DP = 3;

export const GRADUATION_CELL_RADIUS_DP = 4;

export const GRADUATION_HUE_LADDER = [
  'primary',
  'primary',
  'primary',
  'warning',
  'warning',
  'warning',
  'success',
  'success',
  'success',
  'success',
] as const satisfies readonly ('primary' | 'warning' | 'success')[];

export const GRADUATION_MOUNT_FILL_DURATION_MS = 900;

export const GRADUATION_MOUNT_EASING_CONTROL_POINTS = [
  0.2, 0.8, 0.2, 1,
] as const;

export const GRADUATION_DELTA_DURATION_MS = 300;

export const GRADUATION_FRONTIER_HAPTIC_DELAY_MS =
  GRADUATION_MOUNT_FILL_DURATION_MS;

export const ALMOST_GRADUATED_PERCENT = 90;

export const GRADUATION_PULSE_PERIOD_MS = 1200;

export const GRADUATION_PULSE_STAGGER_MS = 80;

export const GRADUATION_PULSE_MIN_OPACITY = 0.55;

export const GRADUATION_FLOW_LOOP_MS = 2400;

export const GRADUATION_FLOW_MAX_DIP = 0.12;

export const COUNT_UP_MOUNT_DURATION_MS = 800;

export const COUNT_UP_DELTA_DURATION_MS = 300;

export const COUNT_UP_FRAME_MS = 16;

export const GRADUATION_TARGET_USD_BY_LAUNCHPAD: Readonly<
  Record<string, number>
> = {
  pumpfun: 69_000,
  bonkfun: 30_000,
  fourmeme: 48_000,
  'four.meme': 48_000,
};

export const DEFAULT_GRADUATION_TARGET_USD = 69_000;
