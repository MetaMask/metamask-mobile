export const RIVE_ARTBOARD_NAME = 'Pull to Refresh';
export const RIVE_STATE_MACHINE_NAME = 'Pull to Refresh';
export const RIVE_IS_PULLING_PATH = 'isPulling';
export const RIVE_IS_REFRESHING_PATH = 'isRefreshing';
export const RIVE_PULL_PROGRESS_PATH = 'pullProgress';

export const PULL_REFRESH_THRESHOLD = 80;
export const PULL_REFRESH_INDICATOR_HEIGHT = PULL_REFRESH_THRESHOLD;
export const PULL_MOVE_ACTIVATION = 10;
export const SCROLL_TOP_THRESHOLD = 5;
export const REFRESH_OUTRO_DURATION_MS = 1000;
export const RIVE_WIDTH = 160;
export const RIVE_HEIGHT = PULL_REFRESH_INDICATOR_HEIGHT;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
