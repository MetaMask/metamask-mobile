import { DeviceInfoExtractor } from './DeviceInfoExtractor';

// NOTE: The env-var fallback path (BROWSERSTACK_DEVICE / BROWSERSTACK_OS_VERSION)
// cannot be unit-tested because babel-plugin-transform-inline-environment-variables
// inlines process.env references at compile time, making runtime mutations ineffective.
// The TestMu fallback reads a copy of process.env, so it can be tested below.

const env = process.env;

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
  describe('TestMu environment fallback', () => {
    const originalDevice = env.TESTMU_DEVICE;
    const originalOsVersion = env.TESTMU_OS_VERSION;

    const restoreEnvVar = (key: string, value: string | undefined) => {
      if (value === undefined) {
        Reflect.deleteProperty(env, key);
      } else {
        env[key] = value;
      }
    };

    beforeEach(() => {
      Reflect.deleteProperty(env, 'TESTMU_DEVICE');
      Reflect.deleteProperty(env, 'TESTMU_OS_VERSION');
    });

    afterEach(() => {
      restoreEnvVar('TESTMU_DEVICE', originalDevice);
      restoreEnvVar('TESTMU_OS_VERSION', originalOsVersion);
    });

    it('returns the TestMu device when both env vars are set', () => {
      env.TESTMU_DEVICE = 'Pixel 8 Pro';
      env.TESTMU_OS_VERSION = '14';

      const result = DeviceInfoExtractor.extract({});

      expect(result).toEqual({
        name: 'Pixel 8 Pro',
        osVersion: '14',
        provider: 'testmu',
      });
    });

    it.each([
      ['TESTMU_DEVICE', 'Pixel 8 Pro'],
      ['TESTMU_OS_VERSION', '14'],
    ])('returns the Unknown defaults when only %s is set', (key, value) => {
      env[key] = value;

      const result = DeviceInfoExtractor.extract({});

      expect(result).toEqual({
        name: 'Unknown',
        osVersion: 'Unknown',
        provider: 'unknown',
      });
    });

    it('prefers the device on the test object over the env vars', () => {
      env.TESTMU_DEVICE = 'Pixel 8 Pro';
      env.TESTMU_OS_VERSION = '14';
      const device = { name: 'Galaxy S23', osVersion: '13', provider: 'local' };

      const result = DeviceInfoExtractor.extract({ use: { device } });

      expect(result).toBe(device);
    });
  });
});
