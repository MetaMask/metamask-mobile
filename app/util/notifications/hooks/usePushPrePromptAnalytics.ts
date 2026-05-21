import { useCallback, useMemo } from 'react';

import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { PushPrePromptVariant } from './usePushPrePromptVariant';

type PushPrePromptAnalyticsVariant = Exclude<PushPrePromptVariant, null>;
type PushPrePromptButton = 'yes' | 'not_now' | 'confirm';
type PushOsPromptResponse = 'allowed' | 'denied';
type PushPrePromptButtonType = 'allow' | 'deny' | 'dismiss';
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
const trackOsPromptShown: PushPrePromptAnalytics['trackOsPromptShown'] = noop;

const pushPrePromptButtonTypeByButton: Record<
  PushPrePromptButton,
  PushPrePromptButtonType
> = {
  yes: 'allow',
  confirm: 'allow',
  not_now: 'deny',
};

const osPromptButtonTypeByResponse: Record<
  PushOsPromptResponse,
  Exclude<PushPrePromptButtonType, 'dismiss'>
> = {
  allowed: 'allow',
  denied: 'deny',
};

export function usePushPrePromptAnalytics() {
  const { createEventBuilder, identify, trackEvent } = useAnalytics();

  const trackPrePromptViewed = useCallback(
    (_variant: PushPrePromptAnalyticsVariant) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_VIEWED,
        ).build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const trackPrePromptButtonType = useCallback(
    (buttonType: PushPrePromptButtonType) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_BUTTON_CLICKED,
        )
          .addProperties({ button_type: buttonType })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const trackPrePromptDismissed = useCallback(
    (_variant: PushPrePromptAnalyticsVariant) => {
      trackPrePromptButtonType('dismiss');
    },
    [trackPrePromptButtonType],
  );

  const trackPrePromptButtonClicked = useCallback(
    (_variant: PushPrePromptAnalyticsVariant, button: PushPrePromptButton) => {
      trackPrePromptButtonType(pushPrePromptButtonTypeByButton[button]);
    },
    [trackPrePromptButtonType],
  );

  const trackOsPromptResponse = useCallback(
    (
      _variant: PushPrePromptAnalyticsVariant,
      response: PushOsPromptResponse,
    ) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.OS_PUSH_NOTIFICATION_BUTTON_CLICKED,
        )
          .addProperties({
            button_type: osPromptButtonTypeByResponse[response],
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

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

  const identifyPushNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      await identify({
        [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: enabled,
      });
    },
    [identify],
  );

  return useMemo(
    () => ({
      trackOsPromptShown,
      trackPrePromptViewed,
      trackPrePromptDismissed,
      trackPrePromptButtonClicked,
      trackOsPromptResponse,
      identifyMarketingConsent,
      identifyPushNotificationsEnabled,
    }),
    [
      identifyMarketingConsent,
      identifyPushNotificationsEnabled,
      trackOsPromptResponse,
      trackPrePromptButtonClicked,
      trackPrePromptDismissed,
      trackPrePromptViewed,
    ],
  );
}
