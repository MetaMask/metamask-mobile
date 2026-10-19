export interface TestMuDeviceCapabilities {
  deviceName: string;
  platformVersion: string;
}

/**
 * BrowserStack device names from device-matrix.json → TestMu AI catalog names.
 * Pixel 8 Pro / Android 14 is the current Android performance device.
 * @see https://www.lambdatest.com/capabilities-generator
 */
const BROWSERSTACK_TO_TESTMU_DEVICE: Record<
  string,
  { name: string; osVersion?: string }
> = {
  'Google Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Google Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Samsung Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'iPhone 16 Pro Max': { name: 'iPhone 16 Pro Max' },
  'iPhone 12': { name: 'iPhone 12' },
};

/**
 * TestMu expects major OS versions (for example "14"), not BrowserStack "14.0".
 */
export function normalizeTestMuPlatformVersion(osVersion: string): string {
  const trimmed = osVersion.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (
    trimmed.includes('.*') ||
    trimmed.includes('|') ||
    trimmed.includes('[')
  ) {
    return trimmed;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  if (parsed === Math.trunc(parsed)) {
    return String(Math.trunc(parsed));
  }

  return trimmed;
}

function readRuntimeEnv(name: string): string | undefined {
  // Copy first so Babel's env inliner does not bake the value at transform time.
  const env = process.env;
  return env[name];
}

function isExactDeviceMatchEnabled(): boolean {
  const value = readRuntimeEnv('TESTMU_DEVICE_EXACT');
  return typeof value === 'string' && value.toLowerCase() === 'true';
}

/**
 * Widen device/OS selection with TestMu App Automation regex so a busy exact
 * device can fall back to any matching inventory entry.
 * Set TESTMU_DEVICE_EXACT=true to pin the catalog name.
 */
export function applyTestMuAvailabilityRegex(
  deviceName: string,
  platformVersion: string,
): TestMuDeviceCapabilities {
  if (isExactDeviceMatchEnabled()) {
    return { deviceName, platformVersion };
  }

  const regexDeviceName = deviceName.includes('.*')
    ? deviceName
    : `${deviceName}.*`;
  const regexPlatformVersion =
    !platformVersion ||
    platformVersion.includes('.*') ||
    platformVersion.includes('[')
      ? platformVersion
      : `${platformVersion}.*`;

  return {
    deviceName: regexDeviceName,
    platformVersion: regexPlatformVersion,
  };
}

/**
 * Map BrowserStack / matrix device names to the exact TestMu catalog name
 * (no availability regex). Use this for labels; use
 * {@link resolveTestMuDeviceCapabilities} for Appium session caps.
 */
export function resolveTestMuCatalogDeviceName(deviceName: string): string {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  return (
    mapped?.name ?? deviceName.replace(/^Google /, '').replace(/^Samsung /, '')
  );
}

/**
 * Map BrowserStack-oriented device matrix values to TestMu AI capabilities.
 * Applies availability regex unless TESTMU_DEVICE_EXACT=true.
 */
export function resolveTestMuDeviceCapabilities(
  deviceName: string,
  osVersion: string,
): TestMuDeviceCapabilities {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  const resolvedName = resolveTestMuCatalogDeviceName(deviceName);
  const resolvedOs = osVersion.trim()
    ? normalizeTestMuPlatformVersion(osVersion)
    : (mapped?.osVersion ?? '');

  return applyTestMuAvailabilityRegex(resolvedName, resolvedOs);
}
