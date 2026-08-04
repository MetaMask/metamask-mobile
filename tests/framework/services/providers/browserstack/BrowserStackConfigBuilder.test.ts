import type { ProjectConfig } from '../../common/types.ts';
import { Platform, ProviderName } from '../../../types.ts';
import { BrowserStackConfigBuilder } from './BrowserStackConfigBuilder.ts';

function createProject(
  overrides: Partial<ProjectConfig['use']> = {},
): ProjectConfig {
  return {
    use: {
      platform: Platform.ANDROID,
      device: {
        provider: ProviderName.BROWSERSTACK,
        name: 'Samsung Galaxy S23',
        osVersion: '13.0',
        orientation: 'portrait',
      },
      app: {
        buildPath: 'bs://fake-app-id',
        packageName: 'io.metamask',
        launchableActivity: 'io.metamask.MainActivity',
      },
      ...overrides,
    },
  } as ProjectConfig;
}

describe('BrowserStackConfigBuilder', () => {
  const envKeys = [
    'BROWSERSTACK_USERNAME',
    'BROWSERSTACK_ACCESS_KEY',
    'BROWSERSTACK_LOCAL',
    'BROWSERSTACK_LOCAL_IDENTIFIER',
    'BROWSERSTACK_GEO_LOCATION',
  ] as const;
  const originalEnvValues: Partial<Record<(typeof envKeys)[number], string>> =
    {};

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnvValues[key] = process.env[key];
    }
    process.env.BROWSERSTACK_USERNAME = 'test-user';
    process.env.BROWSERSTACK_ACCESS_KEY = 'test-key';
    delete process.env.BROWSERSTACK_LOCAL;
    delete process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    delete process.env.BROWSERSTACK_GEO_LOCATION;
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnvValues[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('places network log capabilities inside bstack:options for W3C compliance', () => {
    const builder = new BrowserStackConfigBuilder(createProject());

    const config = builder.build();
    const capabilities = config.capabilities as Record<string, unknown>;
    const bstackOptions = capabilities['bstack:options'] as Record<
      string,
      unknown
    >;

    expect(bstackOptions.networkLogs).toBe(true);
    expect(bstackOptions.networkLogsOptions).toEqual({
      captureContent: true,
    });
    expect(capabilities).not.toHaveProperty('browserstack.networkLogs');
    expect(capabilities).not.toHaveProperty('browserstack.networkLogsOptions');
  });
});
