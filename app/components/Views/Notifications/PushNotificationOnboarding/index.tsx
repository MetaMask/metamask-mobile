import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { setDataCollectionForMarketing } from '../../../../actions/security';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { RootState } from '../../../../reducers';
import { useEnableNotificationsFromPushPrePrompt } from '../../../../util/notifications/hooks/useEnableNotificationsFromPushPrePrompt';
import { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { usePushPrePromptAnalytics } from '../../../../util/notifications/hooks/usePushPrePromptAnalytics';
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

const PushNotificationOnboarding = ({
  dismissPrePrompt,
  isVisible,
  markPrePromptShown,
  nativeOsPermissionEnabled,
  onComplete,
  prePromptVariant,
}: PushNotificationOnboardingProps) => {
  const {
    enableMarketingNotificationsInBackground,
    enableNotificationsInBackground,
    requestPushPermission,
  } = useEnableNotificationsFromPushPrePrompt();
  const { toastRef } = useContext(ToastContext);
  const dispatch = useDispatch();
  const hasMarketingConsent = useSelector(
    (state: RootState) => state.security?.dataCollectionForMarketing === true,
  );
  const viewedPrePromptVariant = useRef<PushPrePromptVariant>(null);
  const {
    trackPrePromptViewed,
    trackPrePromptDismissed,
    trackPrePromptButtonClicked,
    trackOsPromptShown,
    trackOsPromptResponse,
    identifyMarketingConsent,
    identifyPushNotificationsEnabled,
  } = usePushPrePromptAnalytics();

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

  const showToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label }],
        hasNoTimeout: false,
      });
    },
    [toastRef],
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
      if (!hasMarketingConsent) {
        dispatch(setDataCollectionForMarketing(true));
        identifyMarketingConsent(true).catch(() => undefined);
      }

      if (!nativePermissionEnabled) {
        trackOsPromptShown('push_permission');
        nativePermissionEnabled = await requestPushPermission();
        trackOsPromptResponse(
          'push_permission',
          nativePermissionEnabled ? 'allowed' : 'denied',
        );
      }
      identifyPushNotificationsEnabled(nativePermissionEnabled).catch(
        () => undefined,
      );
      showToast(
        nativePermissionEnabled
          ? strings('notifications.push_onboarding.toast_enabled')
          : strings('notifications.push_onboarding.toast_settings_hint'),
      );
    } finally {
      dismissPrePrompt();
      onComplete('engage');
      // Complete the rest of notification setup after the prompt closes.
      enableNotificationsInBackground(nativePermissionEnabled, {
        enableMarketingNotifications: true,
      });
    }
  }, [
    dismissPrePrompt,
    dispatch,
    enableNotificationsInBackground,
    hasMarketingConsent,
    identifyMarketingConsent,
    identifyPushNotificationsEnabled,
    nativeOsPermissionEnabled,
    onComplete,
    requestPushPermission,
    showToast,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
  ]);

  const handlePushPermissionNotNow = useCallback(() => {
    dismissPrePrompt();
    onComplete('dismiss');
    trackPrePromptButtonClicked('push_permission', 'not_now');
    showToast(strings('notifications.push_onboarding.toast_settings_hint'));
  }, [dismissPrePrompt, onComplete, showToast, trackPrePromptButtonClicked]);

  const handleMarketingConsentConfirm = useCallback(() => {
    dismissPrePrompt();
    onComplete('engage');
    trackPrePromptButtonClicked('marketing_consent', 'confirm');
    // This updates the local setting immediately; analytics are a noop for now.
    dispatch(setDataCollectionForMarketing(true));
    identifyMarketingConsent(true).catch(() => undefined);
    enableMarketingNotificationsInBackground();
    showToast(strings('notifications.push_onboarding.toast_marketing_enabled'));
  }, [
    dismissPrePrompt,
    dispatch,
    enableMarketingNotificationsInBackground,
    identifyMarketingConsent,
    onComplete,
    showToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentNotNow = useCallback(() => {
    dismissPrePrompt();
    onComplete('dismiss');
    trackPrePromptButtonClicked('marketing_consent', 'not_now');
    identifyMarketingConsent(false).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_marketing_hint'));
  }, [
    dismissPrePrompt,
    identifyMarketingConsent,
    onComplete,
    showToast,
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
