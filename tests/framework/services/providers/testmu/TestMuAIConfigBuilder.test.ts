jest.mock('../../../logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' },
}));

import { DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS } from '../../../Constants';
import { Platform, ProviderName } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import { TestMuAIConfigBuilder } from './TestMuAIConfigBuilder';

const env = process.env;
const ENV_KEYS = [
  'LT_USERNAME',
  'LT_ACCESS_KEY',
  'TESTMU_LOCAL',
  'TESTMU_GEO_LOCATION',
  'TESTMU_TUNNEL_NAME',
  'TESTMU_NETWORK_LOGS',
  'TESTMU_APPIUM_VERSION',
  'TESTMU_CONNECTION_RETRY_TIMEOUT_MS',
  'TESTMU_DEVICE_EXACT',
  'TESTMU_PROJECT_NAME',
  'TESTMU_BUILD_NAME',
] as const;

interface ProjectOverrides {
  platform?: Platform;
  /** `null` leaves the app without a buildPath. */
  buildPath?: string | null;
  deviceName?: string;
  osVersion?: string;
}

const createProject = ({
  platform = Platform.ANDROID,
  buildPath = 'lt://APP101',
  deviceName = 'Pixel 8 Pro',
  osVersion = '14',
}: ProjectOverrides = {}): ProjectConfig =>
  ({
    use: {
      platform,
      device: { provider: ProviderName.TESTMU, name: deviceName, osVersion },
      app: {
        packageName: 'io.metamask',
        launchableActivity: 'io.metamask.MainActivity',
        appId: 'io.metamask.MetaMask',
        buildPath: buildPath ?? undefined,
      },
    },
  }) as unknown as ProjectConfig;

const buildConfig = (overrides?: ProjectOverrides) =>
  new TestMuAIConfigBuilder(createProject(overrides)).build();

const ltOptions = (config: ReturnType<typeof buildConfig>) =>
  config.capabilities['LT:Options'] as Record<string, unknown>;

describe('TestMuAIConfigBuilder', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = env[key];
      Reflect.deleteProperty(env, key);
    }
    env.LT_USERNAME = 'user';
    env.LT_ACCESS_KEY = 'key';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        Reflect.deleteProperty(env, key);
      } else {
        env[key] = originalEnv[key];
      }
    }
  });

  describe('required inputs', () => {
    it('throws when the app buildPath is missing', () => {
      const project = createProject({ buildPath: null });

      const build = () => new TestMuAIConfigBuilder(project).build();

      expect(build).toThrow('TestMu AI app URL (buildPath) is required');
    });

    it.each(['LT_USERNAME', 'LT_ACCESS_KEY'] as const)(
      'throws when %s is missing',
      (missingKey) => {
        Reflect.deleteProperty(env, missingKey);

        expect(() => buildConfig()).toThrow(
          'LT_USERNAME and LT_ACCESS_KEY environment variables are required',
        );
      },
    );
  });

  describe('network logs', () => {
    it.each([
      [undefined, false],
      ['false', false],
      ['TRUE', false],
      ['true', true],
    ])('sets network to %s -> %s', (envValue, expected) => {
      if (envValue !== undefined) {
        env.TESTMU_NETWORK_LOGS = envValue;
      }

      const config = buildConfig();

      expect(ltOptions(config).network).toBe(expected);
    });
  });

  describe('dashboard grouping', () => {
    it('uses explicit TestMu project and build names when configured', () => {
      env.TESTMU_PROJECT_NAME = 'MetaMask Mobile Scheduled Performance';
      env.TESTMU_BUILD_NAME =
        'TestMu-Android-Performance-main-Scheduled-HyperExecute';

      const options = ltOptions(buildConfig());

      expect(options.project).toBe('MetaMask Mobile Scheduled Performance');
      expect(options.build).toBe(
        'TestMu-Android-Performance-main-Scheduled-HyperExecute',
      );
    });
  });

  describe('tunnel and geolocation', () => {
    it('enables the tunnel and omits geoLocation when TESTMU_LOCAL is true', () => {
      env.TESTMU_LOCAL = 'true';

      const options = ltOptions(buildConfig());

      expect(options.tunnel).toBe(true);
      expect(options).not.toHaveProperty('geoLocation');
    });

    it('defaults geoLocation to SE without a tunnel', () => {
      const options = ltOptions(buildConfig());

      expect(options.geoLocation).toBe('SE');
      expect(options).not.toHaveProperty('tunnel');
    });

    it('uses TESTMU_GEO_LOCATION as geoLocation when set', () => {
      env.TESTMU_GEO_LOCATION = 'US';

      const options = ltOptions(buildConfig());

      expect(options.geoLocation).toBe('US');
    });
  });

  describe('platform capabilities', () => {
    it('configures UiAutomator2 with the package and activity on Android', () => {
      const config = buildConfig({ platform: Platform.ANDROID });

      expect(config.capabilities).toMatchObject({
        platformName: 'android',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': 'io.metamask',
        'appium:appActivity': 'io.metamask.MainActivity',
      });
    });

    it('grants permissions through LT:Options on Android', () => {
      const config = buildConfig({ platform: Platform.ANDROID });

      expect(ltOptions(config).autoGrantPermissions).toBe(true);
    });

    it('configures XCUITest with the bundle id on iOS', () => {
      const config = buildConfig({
        platform: Platform.IOS,
        deviceName: 'iPhone 16 Pro Max',
        osVersion: '18',
      });

      expect(config.capabilities).toMatchObject({
        platformName: 'ios',
        'appium:automationName': 'XCUITest',
        'appium:bundleId': 'io.metamask.MetaMask',
      });
      expect(config.capabilities).not.toHaveProperty('appium:appPackage');
    });

    it('does not set autoGrantPermissions in LT:Options on iOS', () => {
      const config = buildConfig({
        platform: Platform.IOS,
        deviceName: 'iPhone 16 Pro Max',
        osVersion: '18',
      });

      expect(ltOptions(config)).not.toHaveProperty('autoGrantPermissions');
    });
  });

  describe('Appium version', () => {
    it('defaults appiumVersion to 3.0.2', () => {
      const options = ltOptions(buildConfig());

      expect(options.appiumVersion).toBe('3.0.2');
    });

    it('uses TESTMU_APPIUM_VERSION as appiumVersion when set', () => {
      env.TESTMU_APPIUM_VERSION = '2.19.0';

      const options = ltOptions(buildConfig());

      expect(options.appiumVersion).toBe('2.19.0');
    });
  });

  describe('connection retry timeout', () => {
    it('falls back to the default when TESTMU_CONNECTION_RETRY_TIMEOUT_MS is not a number', () => {
      env.TESTMU_CONNECTION_RETRY_TIMEOUT_MS = 'soon';

      const config = buildConfig();

      expect(config.connectionRetryTimeout).toBe(
        DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS,
      );
    });

    it('uses TESTMU_CONNECTION_RETRY_TIMEOUT_MS when it is a number', () => {
      env.TESTMU_CONNECTION_RETRY_TIMEOUT_MS = '120000';

      const config = buildConfig();

      expect(config.connectionRetryTimeout).toBe(120000);
    });
  });
});
