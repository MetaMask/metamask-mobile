import { useMemo } from 'react';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { PushPrePromptVariant } from './usePushPrePromptVariant';

type PushPrePromptAnalyticsVariant = Exclude<PushPrePromptVariant, null>;
type PushPrePromptButton = 'yes' | 'not_now' | 'confirm';
type PushOsPromptResponse = 'allowed' | 'denied';

export function usePushPrePromptAnalytics() {
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();

  return useMemo(
    () => ({
      trackPrePromptViewed: (variant: PushPrePromptAnalyticsVariant) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PUSH_PRE_PROMPT_VIEWED)
            .addProperties({ variant })
            .build(),
        );
      },
      trackPrePromptDismissed: (variant: PushPrePromptAnalyticsVariant) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PUSH_PRE_PROMPT_DISMISSED)
            .addProperties({ variant })
            .build(),
        );
      },
      trackPrePromptButtonClicked: (
        variant: PushPrePromptAnalyticsVariant,
        button: PushPrePromptButton,
      ) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PUSH_PRE_PROMPT_BUTTON_CLICKED)
            .addProperties({ variant, button })
            .build(),
        );
      },
      trackOsPromptShown: (variant: PushPrePromptAnalyticsVariant) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PUSH_OS_PROMPT_SHOWN)
            .addProperties({ variant })
            .build(),
        );
      },
      trackOsPromptResponse: (
        variant: PushPrePromptAnalyticsVariant,
        response: PushOsPromptResponse,
      ) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PUSH_OS_PROMPT_RESPONSE)
            .addProperties({ variant, response })
            .build(),
        );
      },
      identifyPushNotificationsEnabled: (enabled: boolean) =>
        addTraitsToUser({
          [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: enabled,
        }),
      identifyMarketingConsent: (enabled: boolean) =>
        addTraitsToUser({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: enabled,
        }),
    }),
    [addTraitsToUser, createEventBuilder, trackEvent],
  );
}
