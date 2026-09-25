/**
 * Cached device information to avoid repeated HTTP calls to the Appium server.
 *
 * Used only on the Playwright + WebdriverIO/Appium path (`tests/framework/fixtures/playwright`, gestures,
 * utilities). Detox smoke/regression does not use this module — `PlatformDetector` reads from
 * Detox `device` there, not from this cache.
 *
 * Populated once when the Playwright `driver` fixture creates the session.
 */
let cachedPlatform: 'android' | 'ios' = 'android';
let cachedPlatformVersion = '';
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

function assertDeviceInfoPopulated(): void {
  if (!isPopulated) {
    throw new Error(NOT_INITIALIZED_MESSAGE);
  }
}

/**
 * Initialize the device info cache from the driver session.
 * Called once in the fixture at session creation.
 */
export function setDeviceInfo(
  platform: 'android' | 'ios',
  windowSize: { width: number; height: number },
  platformVersion = '',
): void {
  assertPositiveWindowSize(windowSize);
  cachedPlatform = platform;
  cachedWindowSize = windowSize;
  cachedPlatformVersion = platformVersion;
  isPopulated = true;
}

/**
 * Restores the module cache to its initial state. Used by unit tests between cases.
 */
export function resetDeviceInfo(): void {
  isPopulated = false;
  cachedPlatform = 'android';
  cachedPlatformVersion = '';
  cachedWindowSize = { width: 0, height: 0 };
}

/**
 * Get the cached platform.
 * @throws If the cache was never populated (e.g. resetDeviceInfo() without setDeviceInfo()).
 */
export function getPlatform(): 'android' | 'ios' {
  assertDeviceInfoPopulated();
  return cachedPlatform;
}

/**
 * Get the cached OS version string (e.g. `26.0`), or `''` when unknown.
 * @throws If the cache was never populated.
 */
export function getPlatformVersion(): string {
  assertDeviceInfoPopulated();
  return cachedPlatformVersion;
}

/**
 * Get the cached window size.
 * @throws If the cache was never populated.
 */
export function getWindowSize(): { width: number; height: number } {
  assertDeviceInfoPopulated();
  return cachedWindowSize;
}
