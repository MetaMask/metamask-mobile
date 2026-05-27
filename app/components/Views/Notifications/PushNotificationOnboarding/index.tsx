import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useEnableMarketingConsent } from '../../../../util/notifications/hooks/useEnableMarketingConsent';
import { usePushPermissionNotificationSetup } from '../../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { usePushPrePromptAnalytics } from '../../../../util/notifications/hooks/usePushPrePromptAnalytics';
import { isPushPermissionPromptable } from '../../../../util/notifications/services/NotificationService';
import { TAB_BAR_HEIGHT } from '../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import ExistingUserSheet from './ExistingUserSheet';
import NewUserSheet from './NewUserSheet';

export type PushPrePromptCompletionReason = 'complete' | 'dismiss' | 'engage';

interface PushNotificationOnboardingProps {
  dismissPrePrompt: () => void;
  isVisible: boolean;
  markPrePromptShown: () => Promise<void>;
  nativeOsPermissionEnabled: boolean | null;
  onComplete: (reason: PushPrePromptCompletionReason) => void;
  prePromptVariant: PushPrePromptVariant;
}

const styles = StyleSheet.create({
  toastAccessory: {
    alignSelf: 'flex-start',
    marginRight: 12,
    paddingTop: 4,
  },
});

const METRICS_OPT_IN_LOCATION = 'push_pre_prompt';

const PushNotificationOnboarding = ({
  dismissPrePrompt,
  isVisible,
  markPrePromptShown,
  nativeOsPermissionEnabled,
  onComplete,
  prePromptVariant,
}: PushNotificationOnboardingProps) => {
  // Helpers to request OS push permission and finish wiring up notifications once granted.
  const { enableNotificationsInBackground, requestPushPermission } =
    usePushPermissionNotificationSetup();

  const { toastRef } = useContext(ToastContext);
  const viewedPrePromptVariant = useRef<PushPrePromptVariant>(null);

  // Analytics emitters for every stage of the pre-prompt → OS prompt funnel.
  const {
    trackPrePromptViewed,
    trackPrePromptDismissed,
    trackPrePromptButtonClicked,
    trackOsPromptShown,
    trackOsPromptResponse,
    identifyMarketingConsent,
    identifyPushNotificationsEnabled,
  } = usePushPrePromptAnalytics();

  // Opt the user into marketing consent (and MetaMetrics if needed) when they accept the prompt.
  const { enableMarketingConsent } = useEnableMarketingConsent({
    metricsOptInLocation: METRICS_OPT_IN_LOCATION,
  });

  // Mark each variant as shown once, when its sheet first becomes visible.
  useEffect(() => {
    if (
      !isVisible ||
      !prePromptVariant ||
      viewedPrePromptVariant.current === prePromptVariant
    ) {
      return;
    }

    viewedPrePromptVariant.current = prePromptVariant;
    markPrePromptShown().catch(() => undefined);
    trackPrePromptViewed(prePromptVariant);
  }, [isVisible, markPrePromptShown, prePromptVariant, trackPrePromptViewed]);

  const showNotificationStatusToast = useCallback(
    ({
      isEnabled,
      title,
      description,
    }: {
      isEnabled: boolean;
      title: string;
      description: string;
    }) => {
      const iconColor = isEnabled ? IconColor.Success : IconColor.Alternative;

      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: title,
            isBold: true,
          },
        ],
        descriptionOptions: {
          description,
        },
        startAccessory: (
          <View style={styles.toastAccessory}>
            <Icon
              name={isEnabled ? IconName.CheckBold : IconName.Info}
              size={IconSize.Lg}
              color={iconColor}
            />
          </View>
        ),
        customBottomOffset: TAB_BAR_HEIGHT,
        hasNoTimeout: false,
      });
    },
    [toastRef],
  );

  const showPushPermissionToast = useCallback(
    (areNotificationsEnabled: boolean) => {
      showNotificationStatusToast({
        isEnabled: areNotificationsEnabled,
        title: strings(
          areNotificationsEnabled
            ? 'notifications.push_onboarding.new_user.toast.notifications_on.title'
            : 'notifications.push_onboarding.new_user.toast.notifications_off.title',
        ),
        description: strings(
          areNotificationsEnabled
            ? 'notifications.push_onboarding.new_user.toast.notifications_on.description'
            : 'notifications.push_onboarding.new_user.toast.notifications_off.description',
        ),
      });
    },
    [showNotificationStatusToast],
  );

  const showMarketingConsentToast = useCallback(
    (arePersonalizedAlertsEnabled: boolean) => {
      showNotificationStatusToast({
        isEnabled: arePersonalizedAlertsEnabled,
        title: strings(
          arePersonalizedAlertsEnabled
            ? 'notifications.push_onboarding.existing_user.toast.personalized_alerts_on.title'
            : 'notifications.push_onboarding.existing_user.toast.personalized_alerts_off.title',
        ),
        description: strings(
          arePersonalizedAlertsEnabled
            ? 'notifications.push_onboarding.existing_user.toast.personalized_alerts_on.description'
            : 'notifications.push_onboarding.existing_user.toast.personalized_alerts_off.description',
        ),
      });
    },
    [showNotificationStatusToast],
  );

  const handlePrePromptDismissed = useCallback(
    (hasPendingAction?: boolean) => {
      // BottomSheet onClose can fire while a CTA action is still running.
      if (hasPendingAction) {
        return;
      }
      if (prePromptVariant) {
        trackPrePromptDismissed(prePromptVariant);
      }
      dismissPrePrompt();
      onComplete('dismiss');
    },
    [dismissPrePrompt, onComplete, prePromptVariant, trackPrePromptDismissed],
  );

  const handlePushPermissionYes = useCallback(async () => {
    let nativePermissionEnabled = nativeOsPermissionEnabled === true;
    trackPrePromptButtonClicked('push_permission', 'yes');
    try {
      // Accepting push notifications also opts the user into marketing consent.
      await enableMarketingConsent();

      if (!nativePermissionEnabled) {
        // A "denied" OS state means the dialog will not be shown again
        // (iOS after any denial; Android 13+ after permanent denial;
        // Android <13 when the user disabled notifications in Settings).
        // Skip the request and treat it as denied in all those cases.
        const isPromptable = await isPushPermissionPromptable();
        if (isPromptable) {
          trackOsPromptShown('push_permission');
          nativePermissionEnabled = await requestPushPermission();
          trackOsPromptResponse(
            'push_permission',
            nativePermissionEnabled ? 'allowed' : 'denied',
          );
        }
      }
      identifyPushNotificationsEnabled(nativePermissionEnabled).catch(
        () => undefined,
      );
      showPushPermissionToast(nativePermissionEnabled);
    } finally {
      dismissPrePrompt();
      onComplete('engage');
      enableNotificationsInBackground(nativePermissionEnabled);
    }
  }, [
    dismissPrePrompt,
    enableMarketingConsent,
    enableNotificationsInBackground,
    identifyPushNotificationsEnabled,
    nativeOsPermissionEnabled,
    onComplete,
    requestPushPermission,
    showPushPermissionToast,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
  ]);

  const handlePushPermissionNotNow = useCallback(() => {
    dismissPrePrompt();
    onComplete('dismiss');
    trackPrePromptButtonClicked('push_permission', 'not_now');
    showPushPermissionToast(false);
  }, [
    dismissPrePrompt,
    onComplete,
    showPushPermissionToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentConfirm = useCallback(() => {
    dismissPrePrompt();
    onComplete('engage');
    trackPrePromptButtonClicked('marketing_consent', 'confirm');
    enableMarketingConsent().catch(() => undefined);
    showMarketingConsentToast(true);
  }, [
    dismissPrePrompt,
    enableMarketingConsent,
    onComplete,
    showMarketingConsentToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentNotNow = useCallback(() => {
    dismissPrePrompt();
    onComplete('dismiss');
    trackPrePromptButtonClicked('marketing_consent', 'not_now');
    identifyMarketingConsent(false).catch(() => undefined);
    showMarketingConsentToast(false);
  }, [
    dismissPrePrompt,
    identifyMarketingConsent,
    onComplete,
    showMarketingConsentToast,
    trackPrePromptButtonClicked,
  ]);

  return (
    <>
      <NewUserSheet
        isVisible={isVisible && prePromptVariant === 'push_permission'}
        onClose={handlePrePromptDismissed}
        onYes={handlePushPermissionYes}
        onNotNow={handlePushPermissionNotNow}
      />
      <ExistingUserSheet
        isVisible={isVisible && prePromptVariant === 'marketing_consent'}
        onClose={handlePrePromptDismissed}
        onConfirm={handleMarketingConsentConfirm}
        onNotNow={handleMarketingConsentNotNow}
      />
    </>
  );
};

export default PushNotificationOnboarding;
