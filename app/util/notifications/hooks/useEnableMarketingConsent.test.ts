import { act } from '@testing-library/react-native';

import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountType } from '../../../constants/onboarding';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { analyticsControllerWithMarketingConsent } from '../../test/marketingConsentState';
import { analytics } from '../../analytics/analytics';
import { useEnableMarketingConsent } from './useEnableMarketingConsent';

jest.mock('../../analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    isEnabled: jest.fn(),
    optIn: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

const renderUseEnableMarketingConsent = ({
  accountType = AccountType.MetamaskGoogle,
  hasMarketingConsent = false,
}: {
  accountType?: AccountType;
  hasMarketingConsent?: boolean;
} = {}) =>
  renderHookWithProvider(
    () =>
      useEnableMarketingConsent({
        metricsOptInLocation: 'push_pre_prompt',
      }),
    {
      state: {
        engine: {
          backgroundState: {
            AnalyticsController:
              analyticsControllerWithMarketingConsent(hasMarketingConsent),
          },
        },
        onboarding: {
          accountType,
        },
      },
    },
  );

describe('useEnableMarketingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.isEnabled).mockReturnValue(false);
    jest.mocked(analytics.optIn).mockResolvedValue(undefined);
  });

  it('records marketing consent when MetaMetrics is off, without turning MetaMetrics on', async () => {
    // analytics.isEnabled returns false (set in beforeEach)
    const { result, store } = renderUseEnableMarketingConsent();

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).not.toHaveBeenCalled();
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
  });

  it('dispatches and identifies marketing consent when MetaMetrics is already enabled', async () => {
    jest.mocked(analytics.isEnabled).mockReturnValue(true);
    const { result, store } = renderUseEnableMarketingConsent();

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).not.toHaveBeenCalled();
    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(
      jest.mocked(analytics.identify).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(analytics.trackEvent).mock.invocationCallOrder[0],
    );
    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
          account_type: AccountType.MetamaskGoogle,
          location: 'push_pre_prompt',
          updated_after_onboarding: true,
        }),
      }),
    );
    // is_metrics_opted_in must NOT be present — this flow never touches metrics.
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.not.objectContaining({
          is_metrics_opted_in: expect.anything(),
        }),
      }),
    );
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
  });

  it('does nothing when marketing consent is already enabled', async () => {
    jest.mocked(analytics.isEnabled).mockReturnValue(true);
    const { result } = renderUseEnableMarketingConsent({
      hasMarketingConsent: true,
    });

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.identify).not.toHaveBeenCalled();
    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });
});
