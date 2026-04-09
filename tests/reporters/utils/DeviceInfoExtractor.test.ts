import { DeviceInfoExtractor } from './DeviceInfoExtractor';

// NOTE: The env-var fallback path (BROWSERSTACK_DEVICE / BROWSERSTACK_OS_VERSION)
// cannot be unit-tested because babel-plugin-transform-inline-environment-variables
// inlines process.env references at compile time, making runtime mutations ineffective.

describe('DeviceInfoExtractor', () => {
  it('extracts device from test.parent.project.use.device (highest priority)', () => {
    const deviceInfo = {
      name: 'Pixel 6',
      osVersion: '12',
      provider: 'browserstack',
    };
    const testCase = {
      parent: { project: { use: { device: deviceInfo } } },
      project: {
        use: { device: { name: 'Other', osVersion: '11', provider: 'other' } },
      },
    };
    expect(DeviceInfoExtractor.extract(testCase)).toBe(deviceInfo);
  });

  it('extracts device from test.project.use.device when parent path is missing', () => {
    const deviceInfo = {
      name: 'iPhone 14',
      osVersion: '16',
      provider: 'browserstack',
    };
    const testCase = { project: { use: { device: deviceInfo } } };
    expect(DeviceInfoExtractor.extract(testCase)).toBe(deviceInfo);
  });

  it('extracts device from test.use.device when other paths are missing', () => {
    const deviceInfo = {
      name: 'Galaxy S23',
      osVersion: '13',
      provider: 'local',
    };
    const testCase = { use: { device: deviceInfo } };
    expect(DeviceInfoExtractor.extract(testCase)).toBe(deviceInfo);
  });

  it('returns Unknown defaults when no paths match and no env vars', () => {
    expect(DeviceInfoExtractor.extract({})).toEqual({
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    });
  });

  it('returns Unknown defaults for null/undefined input', () => {
    expect(DeviceInfoExtractor.extract(null)).toEqual({
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    });
    expect(DeviceInfoExtractor.extract(undefined)).toEqual({
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    });
  });
});
