import { act, waitFor } from '@testing-library/react-native';

import OAuthService from '../../../core/OAuthService/OAuthService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountType } from '../../../constants/onboarding';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { analytics } from '../../analytics/analytics';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../metrics';
import { updateCachedConsent } from '../../trace';
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

jest.mock('../../metrics', () => ({
  __esModule: true,
  default: jest.fn(),
  UserSettingsAnalyticsMetaData: jest.fn(),
}));

jest.mock('../../trace', () => ({
  updateCachedConsent: jest.fn(),
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

const deviceTraits = { device_trait: 'device' };
const userSettingsTraits = { user_settings_trait: 'settings' };

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
    jest.mocked(generateDeviceAnalyticsMetaData).mockReturnValue(deviceTraits);
    jest
      .mocked(generateUserSettingsAnalyticsMetaData)
      .mockReturnValue(userSettingsTraits);
    jest
      .mocked(OAuthService.updateMarketingOptInStatus)
      .mockResolvedValue(undefined);
  });

  it('opts into metrics, dispatches marketing consent, and identifies consent when analytics is disabled', async () => {
    const { result, store } = renderUseEnableMarketingConsent();

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).toHaveBeenCalledTimes(1);
    expect(updateCachedConsent).toHaveBeenCalledWith(true);
    expect(analytics.identify).toHaveBeenCalledWith({
      ...deviceTraits,
      ...userSettingsTraits,
    });
    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.METRICS_OPT_IN.category,
        properties: expect.objectContaining({
          account_type: AccountType.MetamaskGoogle,
          location: 'push_pre_prompt',
          updated_after_onboarding: true,
        }),
      }),
    );
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
  });

  it('dispatches and identifies marketing consent without metrics opt-in when analytics is already enabled', async () => {
    jest.mocked(analytics.isEnabled).mockReturnValue(true);
    const { result, store } = renderUseEnableMarketingConsent();

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).not.toHaveBeenCalled();
    expect(updateCachedConsent).not.toHaveBeenCalled();
    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(analytics.trackEvent).not.toHaveBeenCalled();
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
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

  it('does nothing when marketing consent is already enabled', async () => {
    const { result } = renderUseEnableMarketingConsent({
      hasMarketingConsent: true,
    });

    await act(async () => {
      await result.current.enableMarketingConsent();
    });

    expect(analytics.optIn).not.toHaveBeenCalled();
    expect(updateCachedConsent).not.toHaveBeenCalled();
    expect(analytics.identify).not.toHaveBeenCalled();
    expect(analytics.trackEvent).not.toHaveBeenCalled();
    expect(OAuthService.updateMarketingOptInStatus).not.toHaveBeenCalled();
  });
});
