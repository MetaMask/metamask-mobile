export const RIVE_ARTBOARD_NAME = 'Pull to Refresh';
export const RIVE_STATE_MACHINE_NAME = 'Pull to Refresh';
export const RIVE_IS_PULLING_PATH = 'isPulling';
export const RIVE_IS_REFRESHING_PATH = 'isRefreshing';
export const RIVE_PULL_PROGRESS_PATH = 'pullProgress';

export const PULL_REFRESH_THRESHOLD = 80;
export const PULL_REFRESH_INDICATOR_HEIGHT = PULL_REFRESH_THRESHOLD;
export const PULL_MOVE_ACTIVATION = 10;
export const PULL_REFRESH_RESISTANCE = 0.2;
export const SCROLL_TOP_THRESHOLD = 5;
export const REFRESH_OUTRO_LEAD_IN_DURATION_MS = 250;
export const REFRESH_OUTRO_DURATION_MS = 1000;
export const PULL_REFRESH_OUTRO_SPRING = {
  damping: 28,
  stiffness: 260,
  mass: 1,
  overshootClamping: true,
} as const;
export const RIVE_WIDTH = 120;
export const RIVE_HEIGHT = PULL_REFRESH_INDICATOR_HEIGHT * 0.75;

export const getResistedPullDistance = (translationY: number): number => {
  'worklet';

  if (translationY <= PULL_REFRESH_THRESHOLD) {
    return translationY;
  }

  return (
    PULL_REFRESH_THRESHOLD +
    (translationY - PULL_REFRESH_THRESHOLD) * PULL_REFRESH_RESISTANCE
  );
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
