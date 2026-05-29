import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { selectDataCollectionForMarketingEnabled } from '../../../selectors/engagement';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { analytics } from '../../analytics/analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../metrics';
import { updateCachedConsent } from '../../trace';
import Logger from '../../Logger';

interface UseEnableMarketingConsentOptions {
  metricsOptInLocation: string;
}

export function useEnableMarketingConsent({
  metricsOptInLocation,
}: UseEnableMarketingConsentOptions) {
  const dispatch = useDispatch();
  const hasMarketingConsent = useSelector(
    selectDataCollectionForMarketingEnabled,
  );
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );
  const accountType = useSelector(selectOnboardingAccountType);

  const enableMarketingConsent = useCallback(async () => {
    const marketingConsentTraits = {
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    };

    if (hasMarketingConsent) {
      return;
    }

    const shouldOptInToMetrics = !analytics.isEnabled();

    if (shouldOptInToMetrics) {
      await analytics.optIn();
      updateCachedConsent(true);
    }

    dispatch(setDataCollectionForMarketing(true));
    if (shouldOptInToMetrics) {
      analytics.identify({
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
        ...marketingConsentTraits,
      });
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.METRICS_OPT_IN,
        )
          .addProperties({
            updated_after_onboarding: true,
            location: metricsOptInLocation,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );
    } else {
      analytics.identify(marketingConsentTraits);
    }
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
      )
        .addProperties({
          ...marketingConsentTraits,
          is_metrics_opted_in: true,
          updated_after_onboarding: true,
          location: metricsOptInLocation,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    if (isSeedlessOnboardingLoginFlow) {
      // Social-login wallets also store marketing opt-in server-side so the
      // setting survives OAuth rehydration. Match settings behavior and revert
      // the optimistic Redux update if that sync fails.
      OAuthService.updateMarketingOptInStatus(true).catch((error) => {
        Logger.error(error as Error);
        dispatch(setDataCollectionForMarketing(false));
      });
    }
  }, [
    accountType,
    dispatch,
    hasMarketingConsent,
    isSeedlessOnboardingLoginFlow,
    metricsOptInLocation,
  ]);

  return { enableMarketingConsent };
}
