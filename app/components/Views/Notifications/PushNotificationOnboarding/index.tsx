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
import type { CompleteSurfaceReason } from '../../../UI/Engagement/startupSurfaces/useCompleteStartupSurface';

interface PushNotificationOnboardingProps {
  dismissPrePrompt: () => void;
  isVisible: boolean;
  markPrePromptShown: () => Promise<void>;
  onComplete: (reason: CompleteSurfaceReason) => void;
  onPendingActionStart: (variant: Exclude<PushPrePromptVariant, null>) => void;
  prePromptVariant: PushPrePromptVariant;
}

const PushNotificationOnboarding = ({
  dismissPrePrompt,
  isVisible,
  markPrePromptShown,
  onComplete,
  onPendingActionStart,
  prePromptVariant,
}: PushNotificationOnboardingProps) => {
  const { enableNotificationsInBackground, requestPushPermission } =
    useEnableNotificationsFromPushPrePrompt();
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
    identifyPushNotificationsEnabled,
    identifyMarketingConsent,
  } = usePushPrePromptAnalytics();

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
    let nativePermissionEnabled = false;
    onPendingActionStart('push_permission');
    trackPrePromptButtonClicked('push_permission', 'yes');
    try {
      if (!hasMarketingConsent) {
        dispatch(setDataCollectionForMarketing(true));
        identifyMarketingConsent(true).catch(() => undefined);
      }

      trackOsPromptShown('push_permission');
      nativePermissionEnabled = await requestPushPermission();
      identifyPushNotificationsEnabled(nativePermissionEnabled).catch(
        () => undefined,
      );
      trackOsPromptResponse(
        'push_permission',
        nativePermissionEnabled ? 'allowed' : 'denied',
      );
      showToast(
        nativePermissionEnabled
          ? strings('notifications.push_onboarding.toast_enabled')
          : strings('notifications.push_onboarding.toast_settings_hint'),
      );
    } finally {
      onComplete('engage');
      dismissPrePrompt();
      enableNotificationsInBackground(nativePermissionEnabled);
    }
  }, [
    dismissPrePrompt,
    dispatch,
    enableNotificationsInBackground,
    hasMarketingConsent,
    identifyMarketingConsent,
    identifyPushNotificationsEnabled,
    onComplete,
    onPendingActionStart,
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
    identifyPushNotificationsEnabled(false).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_settings_hint'));
  }, [
    dismissPrePrompt,
    identifyPushNotificationsEnabled,
    onComplete,
    showToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentConfirm = useCallback(() => {
    dismissPrePrompt();
    onComplete('engage');
    trackPrePromptButtonClicked('marketing_consent', 'confirm');
    dispatch(setDataCollectionForMarketing(true));
    identifyMarketingConsent(true).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_marketing_enabled'));
  }, [
    dismissPrePrompt,
    dispatch,
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
