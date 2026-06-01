/**
 * Cached device information to avoid repeated HTTP calls to the Appium server.
 *
 * Used only on the Playwright + WebdriverIO/Appium path (`tests/framework/fixture`, gestures,
 * utilities). Detox smoke/regression does not use this module — `PlatformDetector` reads from
 * Detox `device` there, not from this cache.
 *
 * Populated once when the Playwright `driver` fixture creates the session.
 */
let cachedPlatform: 'android' | 'ios' = 'android';
let cachedWindowSize: { width: number; height: number } = {
  width: 0,
  height: 0,
};
let isPopulated = false;

const NOT_INITIALIZED_MESSAGE =
  'Device info cache is not initialized. It must be populated via setDeviceInfo() after the driver session is created (Playwright fixture), or set explicitly in unit tests.';

function assertPositiveWindowSize(windowSize: {
  width: number;
  height: number;
}): void {
  const { width, height } = windowSize;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      `Device info cache requires a positive window size; got width=${String(width)}, height=${String(height)}.`,
    );
  }
}

/**
 * Initialize the device info cache from the driver session.
 * Called once in the fixture at session creation.
 */
export function setDeviceInfo(
  platform: 'android' | 'ios',
  windowSize: { width: number; height: number },
): void {
  assertPositiveWindowSize(windowSize);
  cachedPlatform = platform;
  cachedWindowSize = windowSize;
  isPopulated = true;
}

/**
 * Restores the module cache to its initial state. Used by unit tests between cases.
 */
export function resetDeviceInfo(): void {
  isPopulated = false;
  cachedPlatform = 'android';
  cachedWindowSize = { width: 0, height: 0 };
}

/**
 * Get the cached platform.
 * @throws If the cache was never populated (e.g. resetDeviceInfo() without setDeviceInfo()).
 */
export function getPlatform(): 'android' | 'ios' {
  if (!isPopulated) {
    throw new Error(NOT_INITIALIZED_MESSAGE);
  }
  return cachedPlatform;
}

/**
 * Get the cached window size.
 * @throws If the cache was never populated.
 */
export function getWindowSize(): { width: number; height: number } {
  if (!isPopulated) {
    throw new Error(NOT_INITIALIZED_MESSAGE);
  }
  return cachedWindowSize;
}
