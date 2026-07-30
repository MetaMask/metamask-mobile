export interface TestMuDeviceCapabilities {
  deviceName: string;
  platformVersion: string;
}

/**
 * BrowserStack device names from device-matrix.json → TestMu AI catalog names.
 * @see https://www.lambdatest.com/capabilities-generator
 * @see https://www.testmuai.com/support/docs/regular-expression-appium/
 */
const BROWSERSTACK_TO_TESTMU_DEVICE: Record<
  string,
  { name: string; osVersion?: string }
> = {
  // PoC: keep Pixel 7 Pro on Android 13 — TestMu rejects Pixel 7 Pro / 15
  // ("This configuration is not supported") for this org.
  'Google Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Google Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Samsung Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'iPhone 16 Pro Max': { name: 'iPhone 16 Pro Max' },
  'iPhone 12': { name: 'iPhone 12' },
};

/**
 * TestMu expects major OS versions (e.g. "14"), not BrowserStack-style "14.0".
 */
export function normalizeTestMuPlatformVersion(osVersion: string): string {
  const trimmed = osVersion.trim();
  if (!trimmed) {
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

function isExactDeviceMatchEnabled(): boolean {
  // Bracket access so babel-plugin-transform-inline-environment-variables
  // cannot bake an undefined value at Jest transform time.
  const value = process.env['TESTMU_DEVICE_EXACT'];
  return typeof value === 'string' && value.toLowerCase() === 'true';
}

/**
 * Widen device/OS selection with TestMu App Automation regex so a busy exact
 * device (e.g. "Pixel 7 Pro" + "13") can fall back to any matching inventory
 * entry. Set TESTMU_DEVICE_EXACT=true to pin the catalog name instead.
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
 * (no availability regex). Use this for account mapping and logical labels;
 * use {@link resolveTestMuDeviceCapabilities} only for Appium session caps.
 */
export function resolveTestMuCatalogDeviceName(deviceName: string): string {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  return (
    mapped?.name ?? deviceName.replace(/^Google /, '').replace(/^Samsung /, '')
  );
}

/**
 * Map BrowserStack-oriented device matrix values to TestMu AI capabilities.
 * Keeps logical BS names in reports; only session capabilities use the resolved values.
 * Applies availability regex unless TESTMU_DEVICE_EXACT=true.
 */
export function resolveTestMuDeviceCapabilities(
  deviceName: string,
  osVersion: string,
): TestMuDeviceCapabilities {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  const resolvedName = resolveTestMuCatalogDeviceName(deviceName);
  const resolvedOs =
    mapped?.osVersion ?? normalizeTestMuPlatformVersion(osVersion);

  return applyTestMuAvailabilityRegex(resolvedName, resolvedOs);
}
