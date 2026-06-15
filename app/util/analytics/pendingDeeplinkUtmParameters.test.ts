jest.mock('../../core/AppStateEventListener', () => {
  const appStateEventProcessor = {
    pendingDeeplink: null as string | null,
    currentDeeplink: null as string | null,
    clearPendingDeeplink: jest.fn(() => {
      appStateEventProcessor.pendingDeeplink = null;
    }),
    setCurrentDeeplink: jest.fn((deeplink: string | null) => {
      appStateEventProcessor.pendingDeeplink = deeplink;
      appStateEventProcessor.currentDeeplink = deeplink;
    }),
  };

  return { AppStateEventProcessor: appStateEventProcessor };
});

jest.mock('../test/utils', () => {
  const testUtils = {
    hasTestOverrides: false,
    testConfig: {} as Record<string, unknown>,
  };

  return {
    get hasTestOverrides() {
      return testUtils.hasTestOverrides;
    },
    get testConfig() {
      return testUtils.testConfig;
    },
    __testUtils: testUtils,
  };
});

jest.mock('../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({ attribution: { attribution: null } })),
    },
  },
}));

const mockAppStateEventProcessor = jest.requireMock(
  '../../core/AppStateEventListener',
).AppStateEventProcessor as {
  pendingDeeplink: string | null;
  currentDeeplink: string | null;
  clearPendingDeeplink: jest.Mock;
  setCurrentDeeplink: jest.Mock;
};

const mockReduxGetState = jest.requireMock('../../core/redux').default.store
  .getState as jest.Mock;

const mockTestUtils = jest.requireMock('../test/utils').__testUtils as {
  hasTestOverrides: boolean;
  testConfig: Record<string, unknown>;
};

import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import {
  applyMarketingConsentToWalletSetupCompletedEvent,
  clearOnboardingPendingDeeplinkIfNeeded,
  getPendingDeeplinkUtmParameters,
  isOnboardingDeeplink,
} from './pendingDeeplinkUtmParameters';

describe('getPendingDeeplinkUtmParameters', () => {
  beforeEach(() => {
    mockAppStateEventProcessor.pendingDeeplink = null;
    mockAppStateEventProcessor.currentDeeplink = null;
    mockAppStateEventProcessor.clearPendingDeeplink.mockClear();
    mockAppStateEventProcessor.setCurrentDeeplink.mockClear();
    mockReduxGetState.mockReturnValue({ attribution: { attribution: null } });
    mockTestUtils.hasTestOverrides = false;
    mockTestUtils.testConfig = {};
  });

  it('returns utm params from pending deeplink', () => {
    mockAppStateEventProcessor.pendingDeeplink =
      'metamask://onboarding?utm_source=install';

    expect(getPendingDeeplinkUtmParameters()).toEqual({
      utm_source: 'install',
    });
  });

  it('falls back to current deeplink when pending is cleared', () => {
    mockAppStateEventProcessor.currentDeeplink =
      'metamask://onboarding?utm_source=current';

    expect(getPendingDeeplinkUtmParameters()).toEqual({
      utm_source: 'current',
    });
  });

  it('returns null when no deeplink is available', () => {
    expect(getPendingDeeplinkUtmParameters()).toBeNull();
  });

  it('hydrates pending deeplink from E2E launch arg when missing', () => {
    mockTestUtils.hasTestOverrides = true;
    mockTestUtils.testConfig.e2ePendingInstallDeeplink =
      'metamask://onboarding?utm_source=e2e';

    expect(getPendingDeeplinkUtmParameters()).toEqual({
      utm_source: 'e2e',
    });
    expect(mockAppStateEventProcessor.setCurrentDeeplink).toHaveBeenCalledWith(
      'metamask://onboarding?utm_source=e2e',
    );
  });

  it('falls back to preloaded Redux attribution in E2E when deeplink is absent', () => {
    mockTestUtils.hasTestOverrides = true;
    mockReduxGetState.mockReturnValue({
      attribution: {
        attribution: {
          utm_source: 'e2e_wsc_utm_source',
          utm_campaign: 'e2e_wsc_campaign',
          attribution_id: 'e2e_wsc_attr_id',
          capturedAt: Date.now(),
        },
      },
    });

    expect(getPendingDeeplinkUtmParameters()).toEqual({
      utm_source: 'e2e_wsc_utm_source',
      utm_campaign: 'e2e_wsc_campaign',
      attribution_id: 'e2e_wsc_attr_id',
    });
  });
});

describe('clearOnboardingPendingDeeplinkIfNeeded', () => {
  beforeEach(() => {
    mockAppStateEventProcessor.pendingDeeplink = null;
    mockAppStateEventProcessor.currentDeeplink = null;
    mockAppStateEventProcessor.clearPendingDeeplink.mockClear();
  });

  it('clears pending deeplink for onboarding links', () => {
    mockAppStateEventProcessor.pendingDeeplink =
      'metamask://onboarding?utm_source=install';

    clearOnboardingPendingDeeplinkIfNeeded();

    expect(mockAppStateEventProcessor.clearPendingDeeplink).toHaveBeenCalled();
  });

  it('does not clear pending deeplink for non-onboarding links', () => {
    mockAppStateEventProcessor.pendingDeeplink =
      'metamask://swap?utm_source=install';

    clearOnboardingPendingDeeplinkIfNeeded();

    expect(
      mockAppStateEventProcessor.clearPendingDeeplink,
    ).not.toHaveBeenCalled();
  });
});

describe('isOnboardingDeeplink', () => {
  it('returns true for onboarding pathname', () => {
    expect(isOnboardingDeeplink('metamask://onboarding?utm_source=x')).toBe(
      true,
    );
  });

  it('returns false for other pathnames', () => {
    expect(isOnboardingDeeplink('metamask://swap?utm_source=x')).toBe(false);
  });
});

describe('applyMarketingConsentToWalletSetupCompletedEvent', () => {
  const walletSetupCompletedEvent = AnalyticsEventBuilder.createEventBuilder(
    EVENT_NAME.WALLET_SETUP_COMPLETED,
  )
    .addProperties({
      wallet_setup_type: 'new',
      utm_source: 'install',
      utm_campaign: 'spring',
    })
    .build();

  it('keeps utm params when marketing consent is granted', () => {
    const result = applyMarketingConsentToWalletSetupCompletedEvent(
      walletSetupCompletedEvent,
      true,
    );

    expect(result.properties?.utm_source).toBe('install');
    expect(result.properties?.utm_campaign).toBe('spring');
  });

  it('strips utm params when marketing consent is denied', () => {
    const result = applyMarketingConsentToWalletSetupCompletedEvent(
      walletSetupCompletedEvent,
      false,
    );

    expect(result.properties?.utm_source).toBeUndefined();
    expect(result.properties?.utm_campaign).toBeUndefined();
    expect(result.properties?.wallet_setup_type).toBe('new');
  });

  it('returns other events unchanged', () => {
    const otherEvent = AnalyticsEventBuilder.createEventBuilder('Other Event')
      .addProperties({ utm_source: 'install' })
      .build();

    expect(
      applyMarketingConsentToWalletSetupCompletedEvent(otherEvent, false),
    ).toEqual(otherEvent);
  });
});
