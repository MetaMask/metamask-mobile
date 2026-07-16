export interface TestMuDeviceCapabilities {
  deviceName: string;
  platformVersion: string;
}

/**
 * BrowserStack device names from device-matrix.json → TestMu AI catalog names.
 * @see https://www.lambdatest.com/capabilities-generator
 */
const BROWSERSTACK_TO_TESTMU_DEVICE: Record<
  string,
  { name: string; osVersion?: string }
> = {
  'Google Pixel 8 Pro': { name: 'Pixel 8 Pro' },
  'Samsung Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra' },
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

/**
 * Map BrowserStack-oriented device matrix values to TestMu AI capabilities.
 * Keeps logical BS names in reports; only session capabilities use the resolved values.
 */
export function resolveTestMuDeviceCapabilities(
  deviceName: string,
  osVersion: string,
): TestMuDeviceCapabilities {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  const resolvedName =
    mapped?.name ?? deviceName.replace(/^Google /, '').replace(/^Samsung /, '');

  return {
    deviceName: resolvedName,
    platformVersion:
      mapped?.osVersion ?? normalizeTestMuPlatformVersion(osVersion),
  };
}
