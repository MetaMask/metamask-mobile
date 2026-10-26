import { getAnalyticsControllerInstanceOptions } from './analytics-controller';

jest.mock('../../../../util/test/utils', () => ({
  hasTestOverrides: false,
}));

jest.mock('../../controllers/analytics-controller/platform-adapter', () => ({
  createPlatformAdapter: jest.fn(() => ({ name: 'segment' })),
}));

jest.mock(
  '../../controllers/analytics-controller/platform-adapter-e2e',
  () => ({
    createPlatformAdapter: jest.fn(() => ({ name: 'e2e' })),
  }),
);

jest.mock('../../../Braze', () => ({
  getBrazePlugin: jest.fn(() => ({ name: 'braze' })),
}));

jest.mock('../../../../util/analytics/appVersionSegmentPlugin', () =>
  jest.fn().mockImplementation(() => ({ name: 'appVersion' })),
);

describe('getAnalyticsControllerInstanceOptions', () => {
  const analyticsId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the MMKV analytics id and keeps anonymous events on', () => {
    const { createPlatformAdapter } = jest.requireMock(
      '../../controllers/analytics-controller/platform-adapter',
    );

    const options = getAnalyticsControllerInstanceOptions(analyticsId);

    expect(options.analyticsId).toBe(analyticsId);
    expect(options.isAnonymousEventsFeatureEnabled).toBe(true);
    expect(options.isGeolocationEnabled).toBe(false);
    expect(createPlatformAdapter).toHaveBeenCalledWith([
      { name: 'braze' },
      { name: 'appVersion' },
    ]);
    expect(options.platformAdapter).toEqual({ name: 'segment' });
  });

  it('uses the E2E platform adapter when test overrides are enabled', () => {
    jest.resetModules();
    jest.doMock('../../../../util/test/utils', () => ({
      hasTestOverrides: true,
    }));
    jest.doMock(
      '../../controllers/analytics-controller/platform-adapter-e2e',
      () => ({
        createPlatformAdapter: jest.fn(() => ({ name: 'e2e' })),
      }),
    );

    let options:
      | ReturnType<typeof getAnalyticsControllerInstanceOptions>
      | undefined;
    jest.isolateModules(() => {
      const { getAnalyticsControllerInstanceOptions: getOptions } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./analytics-controller') as typeof import('./analytics-controller');
      options = getOptions(analyticsId);
    });

    expect(options).toEqual(
      expect.objectContaining({
        analyticsId,
        isAnonymousEventsFeatureEnabled: true,
        isGeolocationEnabled: false,
        platformAdapter: { name: 'e2e' },
      }),
    );
  });
});
