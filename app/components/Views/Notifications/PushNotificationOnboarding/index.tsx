import React, { useCallback, useEffect, useRef } from 'react';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useEnableMarketingConsent } from '../../../../util/notifications/hooks/useEnableMarketingConsent';
import { usePushPermissionNotificationSetup } from '../../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { usePushPrePromptAnalytics } from '../../../../util/notifications/hooks/usePushPrePromptAnalytics';
import NotificationService, {
  canOsPromptForPushPermission,
  isPushPermissionPromptable,
} from '../../../../util/notifications/services/NotificationService';
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
      toast({
        title,
        description,
        severity: isEnabled ? ToastSeverity.Success : ToastSeverity.Default,
        hasNoTimeout: false,
      });
    },
    [],
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
    // Skip the "notifications are off" toast when we just sent the user to Settings.
    let didRouteToSystemSettings = false;
    trackPrePromptButtonClicked('push_permission', 'yes');
    try {
      // Accepting push notifications also opts the user into marketing consent.
      await enableMarketingConsent();

      if (!nativePermissionEnabled) {
        // iOS denied is not promptable. Android treats any not-granted state as
        // promptable; Android < 13 is handled below via canOsPromptForPushPermission.
        const isPromptable = await isPushPermissionPromptable();

        if (isPromptable && !canOsPromptForPushPermission()) {
          // No OS dialog exists (Android < 13). Don't call requestPushPermission:
          // it would log a deny the user never gave, and mark the OS prompt as
          // requested so the wallet-home checklist drops its notifications step.
          didRouteToSystemSettings = true;
          await NotificationService.requestPushNotificationsPermission();
        } else if (isPromptable) {
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
      if (!didRouteToSystemSettings) {
        showPushPermissionToast(nativePermissionEnabled);
      }
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
    // This variant is shown only when OS permission is already granted, so no
    // OS prompt runs. Still initialize AUS notification preferences here —
    // otherwise later settings toggles no-op and Braze never gets notifications_*
    // attributes. Android < 13 with notifications on only ever sees this sheet.
    enableNotificationsInBackground(nativeOsPermissionEnabled === true);
  }, [
    dismissPrePrompt,
    enableMarketingConsent,
    enableNotificationsInBackground,
    nativeOsPermissionEnabled,
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
