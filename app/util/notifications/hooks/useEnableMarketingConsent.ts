import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectDataCollectionForMarketingEnabled } from '../../../selectors/engagement';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { analytics } from '../../analytics/analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

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
  const accountType = useSelector(selectOnboardingAccountType);

  const enableMarketingConsent = useCallback(async () => {
    const marketingConsentTraits = {
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    };

    if (hasMarketingConsent) {
      return;
    }

    dispatch(setDataCollectionForMarketing(true));
    analytics.identify(marketingConsentTraits);
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
      )
        .addProperties({
          ...marketingConsentTraits,
          updated_after_onboarding: true,
          location: metricsOptInLocation,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );
  }, [accountType, dispatch, hasMarketingConsent, metricsOptInLocation]);

  return { enableMarketingConsent };
}
