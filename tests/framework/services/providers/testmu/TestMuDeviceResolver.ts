export interface TestMuDeviceCapabilities {
  deviceName: string;
  platformVersion: string;
}

/**
 * BrowserStack device names from device-matrix.json → TestMu AI catalog names.
 */
const BROWSERSTACK_TO_TESTMU_DEVICE: Record<
  string,
  { name: string; osVersion?: string }
> = {
  'Google Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Pixel 7 Pro': { name: 'Pixel 7 Pro', osVersion: '13' },
  'Google Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Pixel 8 Pro': { name: 'Pixel 8 Pro', osVersion: '14' },
  'Samsung Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'Galaxy S25 Ultra': { name: 'Galaxy S25 Ultra', osVersion: '15' },
  'iPhone 16 Pro Max': { name: 'iPhone 16 Pro Max' },
  'iPhone 12': { name: 'iPhone 12' },
};

export function normalizeTestMuPlatformVersion(osVersion: string): string {
  const trimmed = osVersion.trim();
  if (!trimmed) {
    return trimmed;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  return parsed === Math.trunc(parsed) ? String(Math.trunc(parsed)) : trimmed;
}

function isExactDeviceMatchEnabled(): boolean {
  // eslint-disable-next-line dot-notation
  const value = process.env['TESTMU_DEVICE_EXACT'];
  return typeof value === 'string' && value.toLowerCase() === 'true';
}

export function applyTestMuAvailabilityRegex(
  deviceName: string,
  platformVersion: string,
): TestMuDeviceCapabilities {
  if (isExactDeviceMatchEnabled()) {
    return { deviceName, platformVersion };
  }

  return {
    deviceName: deviceName.includes('.*') ? deviceName : `${deviceName}.*`,
    platformVersion:
      !platformVersion ||
      platformVersion.includes('.*') ||
      platformVersion.includes('[')
        ? platformVersion
        : `${platformVersion}.*`,
  };
}

export function resolveTestMuCatalogDeviceName(deviceName: string): string {
  const mapped = BROWSERSTACK_TO_TESTMU_DEVICE[deviceName];
  return (
    mapped?.name ?? deviceName.replace(/^Google /, '').replace(/^Samsung /, '')
  );
}

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
