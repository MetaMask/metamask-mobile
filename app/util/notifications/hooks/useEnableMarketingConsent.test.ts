import { act, waitFor } from '@testing-library/react-native';

import OAuthService from '../../../core/OAuthService/OAuthService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountType } from '../../../constants/onboarding';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { analytics } from '../../analytics/analytics';
import Logger from '../../Logger';
import { useEnableMarketingConsent } from './useEnableMarketingConsent';

jest.mock('../../analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    isEnabled: jest.fn(),
    optIn: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    updateMarketingOptInStatus: jest.fn(),
  },
}));

jest.mock('../../Logger', () => ({
  error: jest.fn(),
}));

const renderUseEnableMarketingConsent = ({
  accountType = AccountType.MetamaskGoogle,
  hasMarketingConsent = false,
  isSeedlessOnboardingLoginFlow = false,
}: {
  accountType?: AccountType;
  hasMarketingConsent?: boolean;
  isSeedlessOnboardingLoginFlow?: boolean;
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
            SeedlessOnboardingController: {
              vault: isSeedlessOnboardingLoginFlow ? 'vault' : undefined,
            },
          },
        },
        onboarding: {
          accountType,
        },
        security: {
          dataCollectionForMarketing: hasMarketingConsent,
        },
      },
    },
  );

describe('useEnableMarketingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.isEnabled).mockReturnValue(false);
    jest.mocked(analytics.optIn).mockResolvedValue(undefined);
    jest
      .mocked(OAuthService.updateMarketingOptInStatus)
      .mockResolvedValue(undefined);
  });

  it('does nothing when MetaMetrics is off — never enables metrics or data collection', async () => {
    // analytics.isEnabled returns false (set in beforeEach)
    const { result, store } = renderUseEnableMarketingConsent();

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).not.toHaveBeenCalled();
    expect(analytics.identify).not.toHaveBeenCalled();
    expect(analytics.trackEvent).not.toHaveBeenCalled();
    expect(OAuthService.updateMarketingOptInStatus).not.toHaveBeenCalled();
    expect(store.getState().security.dataCollectionForMarketing).toBe(false);
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
    expect(OAuthService.updateMarketingOptInStatus).not.toHaveBeenCalled();
  });

  it('syncs marketing consent to OAuth for seedless users', async () => {
    jest.mocked(analytics.isEnabled).mockReturnValue(true);
    const { result, store } = renderUseEnableMarketingConsent({
      isSeedlessOnboardingLoginFlow: true,
    });

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(OAuthService.updateMarketingOptInStatus).toHaveBeenCalledWith(true);
  });

  it('reverts Redux marketing consent when the seedless OAuth sync fails', async () => {
    jest.mocked(analytics.isEnabled).mockReturnValue(true);
    jest
      .mocked(OAuthService.updateMarketingOptInStatus)
      .mockRejectedValue(new Error('oauth failed'));
    const { result, store } = renderUseEnableMarketingConsent({
      isSeedlessOnboardingLoginFlow: true,
    });

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    await waitFor(() => {
      expect(store.getState().security.dataCollectionForMarketing).toBe(false);
    });
    expect(Logger.error).toHaveBeenCalled();
  });
});
