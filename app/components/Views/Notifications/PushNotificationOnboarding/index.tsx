import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { setDataCollectionForMarketing } from '../../../../actions/security';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { RootState } from '../../../../reducers';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import {
  PushPrePromptVariant,
  usePushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { usePushPrePromptAnalytics } from '../../../../util/notifications/hooks/usePushPrePromptAnalytics';
import ExistingUserSheet from './ExistingUserSheet';
import NewUserSheet from './NewUserSheet';

const PushNotificationOnboarding = () => {
  const {
    variant: prePromptVariant,
    markShown: markPrePromptShown,
    dismiss: dismissPrePrompt,
  } = usePushPrePromptVariant();
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: true,
  });
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
      !prePromptVariant ||
      viewedPrePromptVariant.current === prePromptVariant
    ) {
      return;
    }

    viewedPrePromptVariant.current = prePromptVariant;
    markPrePromptShown().catch(() => undefined);
    trackPrePromptViewed(prePromptVariant);
  }, [markPrePromptShown, prePromptVariant, trackPrePromptViewed]);

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
    },
    [dismissPrePrompt, prePromptVariant, trackPrePromptDismissed],
  );

  const handlePushPermissionYes = useCallback(async () => {
    dismissPrePrompt();
    trackPrePromptButtonClicked('push_permission', 'yes');
    if (!hasMarketingConsent) {
      dispatch(setDataCollectionForMarketing(true));
      await identifyMarketingConsent(true);
    }

    trackOsPromptShown('push_permission');
    const isPushEnabled = await enableNotifications();
    await identifyPushNotificationsEnabled(isPushEnabled);
    trackOsPromptResponse(
      'push_permission',
      isPushEnabled ? 'allowed' : 'denied',
    );
    showToast(
      isPushEnabled
        ? strings('notifications.push_onboarding.toast_enabled')
        : strings('notifications.push_onboarding.toast_settings_hint'),
    );
  }, [
    dismissPrePrompt,
    dispatch,
    enableNotifications,
    hasMarketingConsent,
    identifyMarketingConsent,
    identifyPushNotificationsEnabled,
    showToast,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
  ]);

  const handlePushPermissionNotNow = useCallback(() => {
    dismissPrePrompt();
    trackPrePromptButtonClicked('push_permission', 'not_now');
    identifyPushNotificationsEnabled(false).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_settings_hint'));
  }, [
    dismissPrePrompt,
    identifyPushNotificationsEnabled,
    showToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentConfirm = useCallback(() => {
    dismissPrePrompt();
    trackPrePromptButtonClicked('marketing_consent', 'confirm');
    dispatch(setDataCollectionForMarketing(true));
    identifyMarketingConsent(true).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_marketing_enabled'));
  }, [
    dismissPrePrompt,
    dispatch,
    identifyMarketingConsent,
    showToast,
    trackPrePromptButtonClicked,
  ]);

  const handleMarketingConsentNotNow = useCallback(() => {
    dismissPrePrompt();
    trackPrePromptButtonClicked('marketing_consent', 'not_now');
    identifyMarketingConsent(false).catch(() => undefined);
    showToast(strings('notifications.push_onboarding.toast_marketing_hint'));
  }, [
    dismissPrePrompt,
    identifyMarketingConsent,
    showToast,
    trackPrePromptButtonClicked,
  ]);

  return (
    <>
      <NewUserSheet
        isVisible={prePromptVariant === 'push_permission'}
        onClose={handlePrePromptDismissed}
        onYes={handlePushPermissionYes}
        onNotNow={handlePushPermissionNotNow}
      />
      <ExistingUserSheet
        isVisible={prePromptVariant === 'marketing_consent'}
        onClose={handlePrePromptDismissed}
        onConfirm={handleMarketingConsentConfirm}
        onNotNow={handleMarketingConsentNotNow}
      />
    </>
  );
};

export default PushNotificationOnboarding;
