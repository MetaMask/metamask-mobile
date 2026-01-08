// mock expo-screen-orientation for testing

export const lockAsync = jest.fn().mockResolvedValue(undefined);
export const unlockAsync = jest.fn().mockResolvedValue(undefined);
export const getOrientationAsync = jest.fn().mockResolvedValue(1); // Portrait
export const getOrientationLockAsync = jest.fn().mockResolvedValue(0);
export const getPlatformOrientationLockAsync = jest.fn().mockResolvedValue({});
export const supportsOrientationLockAsync = jest.fn().mockResolvedValue(true);

export const Orientation = {
  UNKNOWN: 0,
  PORTRAIT_UP: 1,
  PORTRAIT_DOWN: 2,
  LANDSCAPE_LEFT: 3,
  LANDSCAPE_RIGHT: 4,
};

export const OrientationLock = {
  DEFAULT: 0,
  ALL: 1,
  PORTRAIT: 2,
  PORTRAIT_UP: 3,
  PORTRAIT_DOWN: 4,
  LANDSCAPE: 5,
  LANDSCAPE_LEFT: 6,
  LANDSCAPE_RIGHT: 7,
  OTHER: 8,
  UNKNOWN: 9,
};

export const SizeClassIOS = {
  UNKNOWN: 0,
  COMPACT: 1,
  REGULAR: 2,
};

export const WebOrientationLock = {
  PORTRAIT_PRIMARY: 'portrait-primary',
  PORTRAIT_SECONDARY: 'portrait-secondary',
  LANDSCAPE_PRIMARY: 'landscape-primary',
  LANDSCAPE_SECONDARY: 'landscape-secondary',
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
  NATURAL: 'natural',
  ANY: 'any',
  UNKNOWN: 'unknown',
};

export const WebOrientation = {
  PORTRAIT_PRIMARY: 0,
  PORTRAIT_SECONDARY: 180,
  LANDSCAPE_PRIMARY: 90,
  LANDSCAPE_SECONDARY: -90,
};

// Default export for namespace imports
export default {
  lockAsync,
  unlockAsync,
  getOrientationAsync,
  getOrientationLockAsync,
  getPlatformOrientationLockAsync,
  supportsOrientationLockAsync,
  Orientation,
  OrientationLock,
  SizeClassIOS,
  WebOrientationLock,
  WebOrientation,
};
