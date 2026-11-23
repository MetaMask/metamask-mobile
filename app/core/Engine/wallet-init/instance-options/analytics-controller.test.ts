import { getDefaultAnalyticsControllerState } from '@metamask/analytics-controller';
import {
  getAnalyticsControllerInstanceOptions,
  withMobileAnalyticsControllerState,
} from './analytics-controller';
import { createPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter-e2e';

const mockHasTestOverrides = { value: false };

jest.mock('../../../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides.value;
  },
}));

jest.mock('../../controllers/analytics-controller/platform-adapter', () => ({
  createPlatformAdapter: jest.fn(() => ({ name: 'platform-adapter' })),
}));

jest.mock(
  '../../controllers/analytics-controller/platform-adapter-e2e',
  () => ({
    createPlatformAdapter: jest.fn(() => ({ name: 'e2e-platform-adapter' })),
  }),
);

jest.mock('../../../Braze', () => ({
  getBrazePlugin: jest.fn(() => ({ name: 'braze' })),
}));

jest.mock('../../../../util/analytics/appVersionSegmentPlugin', () =>
  jest.fn().mockImplementation(() => ({ name: 'appVersion' })),
);

describe('getAnalyticsControllerInstanceOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasTestOverrides.value = false;
  });

  it('builds options with the Segment platform adapter and Braze plugins', () => {
    const options = getAnalyticsControllerInstanceOptions('mmkv-analytics-id');

    expect(createPlatformAdapter).toHaveBeenCalledWith([
      { name: 'braze' },
      { name: 'appVersion' },
    ]);
    expect(options).toStrictEqual({
      platformAdapter: { name: 'platform-adapter' },
      analyticsId: 'mmkv-analytics-id',
      isAnonymousEventsFeatureEnabled: true,
      isGeolocationEnabled: false,
    });
  });

  it('uses the E2E platform adapter when test overrides are active', () => {
    mockHasTestOverrides.value = true;

    const options = getAnalyticsControllerInstanceOptions('mmkv-analytics-id');

    expect(createE2EPlatformAdapter).toHaveBeenCalledTimes(1);
    expect(createPlatformAdapter).not.toHaveBeenCalled();
    expect(options.platformAdapter).toStrictEqual({
      name: 'e2e-platform-adapter',
    });
  });
});

describe('withMobileAnalyticsControllerState', () => {
  it('fills the default AnalyticsController state when nothing is persisted', () => {
    const state = withMobileAnalyticsControllerState({}, 'mmkv-analytics-id');

    expect(state.AnalyticsController).toStrictEqual({
      ...getDefaultAnalyticsControllerState(),
      analyticsId: 'mmkv-analytics-id',
    });
  });

  it('keeps persisted consent, marketing and eventsConfig while forcing the MMKV analytics ID', () => {
    const eventsConfig = {
      schemaVersion: '1',
      version: '2',
      timestamp: 1,
      events: { 'Swap Completed': ['marketing'] },
    };

    const state = withMobileAnalyticsControllerState(
      {
        AnalyticsController: {
          analyticsId: 'persisted-analytics-id',
          optedIn: true,
          consentDecisionMade: true,
          optedInToMarketing: true,
          marketingConsentDecisionMade: true,
          marketingCampaignCookieId: 'cookie',
          eventsConfig,
        },
      },
      'mmkv-analytics-id',
    );

    expect(state.AnalyticsController).toStrictEqual(
      expect.objectContaining({
        analyticsId: 'mmkv-analytics-id',
        optedIn: true,
        consentDecisionMade: true,
        optedInToMarketing: true,
        marketingConsentDecisionMade: true,
        marketingCampaignCookieId: 'cookie',
        eventsConfig,
      }),
    );
  });

  it('falls back to default consent flags when persisted values are missing', () => {
    const defaultState = getDefaultAnalyticsControllerState();

    const state = withMobileAnalyticsControllerState(
      { AnalyticsController: { analyticsId: 'persisted-analytics-id' } },
      'mmkv-analytics-id',
    );

    expect(state.AnalyticsController).toStrictEqual(
      expect.objectContaining({
        optedIn: defaultState.optedIn,
        consentDecisionMade: defaultState.consentDecisionMade,
      }),
    );
  });

  it('leaves other controller state untouched', () => {
    const keyringState = { vault: 'encrypted-vault-blob' };

    const state = withMobileAnalyticsControllerState(
      { KeyringController: keyringState },
      'mmkv-analytics-id',
    );

    expect(state.KeyringController).toBe(keyringState);
  });
});
