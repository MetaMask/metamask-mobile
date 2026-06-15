jest.mock('../../core/AppStateEventListener', () => {
  const appStateEventProcessor = {
    pendingDeeplink: null as string | null,
    currentDeeplink: null as string | null,
    clearPendingDeeplink: jest.fn(() => {
      appStateEventProcessor.pendingDeeplink = null;
    }),
  };

  return { AppStateEventProcessor: appStateEventProcessor };
});

const mockAppStateEventProcessor = jest.requireMock(
  '../../core/AppStateEventListener',
).AppStateEventProcessor as {
  pendingDeeplink: string | null;
  currentDeeplink: string | null;
  clearPendingDeeplink: jest.Mock;
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
