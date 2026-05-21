import { useCallback, useMemo } from 'react';

import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { PushPrePromptVariant } from './usePushPrePromptVariant';

type PushPrePromptAnalyticsVariant = Exclude<PushPrePromptVariant, null>;
type PushPrePromptButton = 'yes' | 'not_now' | 'confirm';
type PushOsPromptResponse = 'allowed' | 'denied';
const PUSH_PRE_PROMPT_ANALYTICS_LOCATION = 'push_pre_prompt';

interface PushPrePromptAnalytics {
  trackPrePromptViewed: (variant: PushPrePromptAnalyticsVariant) => void;
  trackPrePromptDismissed: (variant: PushPrePromptAnalyticsVariant) => void;
  trackPrePromptButtonClicked: (
    variant: PushPrePromptAnalyticsVariant,
    button: PushPrePromptButton,
  ) => void;
  trackOsPromptShown: (variant: PushPrePromptAnalyticsVariant) => void;
  trackOsPromptResponse: (
    variant: PushPrePromptAnalyticsVariant,
    response: PushOsPromptResponse,
  ) => void;
  identifyMarketingConsent: (enabled: boolean) => Promise<void>;
  identifyPushNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

const noop = () => undefined;
const noopAsync = () => Promise.resolve();

const pushPrePromptAnalyticsNoops: PushPrePromptAnalytics = {
  trackPrePromptViewed: noop,
  trackPrePromptDismissed: noop,
  trackPrePromptButtonClicked: noop,
  trackOsPromptShown: noop,
  trackOsPromptResponse: noop,
  identifyMarketingConsent: noopAsync,
  // TODO: Wire once the Segment schema supports push_notifications_enabled.
  identifyPushNotificationsEnabled: noopAsync,
};

export function usePushPrePromptAnalytics() {
  const { createEventBuilder, identify, trackEvent } = useAnalytics();

  const identifyMarketingConsent = useCallback(
    async (enabled: boolean) => {
      await identify({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: enabled,
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
          .addProperties({
            [UserProfileProperty.HAS_MARKETING_CONSENT]: enabled,
            updated_after_onboarding: true,
            location: PUSH_PRE_PROMPT_ANALYTICS_LOCATION,
          })
          .build(),
      );
    },
    [createEventBuilder, identify, trackEvent],
  );

  return useMemo(
    () => ({
      ...pushPrePromptAnalyticsNoops,
      identifyMarketingConsent,
    }),
    [identifyMarketingConsent],
  );
}
