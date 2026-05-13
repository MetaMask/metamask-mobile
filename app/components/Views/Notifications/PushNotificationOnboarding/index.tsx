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

  useEffect(() => {
    if (
      !prePromptVariant ||
      viewedPrePromptVariant.current === prePromptVariant
    ) {
      return;
    }

    viewedPrePromptVariant.current = prePromptVariant;
    markPrePromptShown().catch(() => undefined);
  }, [markPrePromptShown, prePromptVariant]);

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
      dismissPrePrompt();
    },
    [dismissPrePrompt],
  );

  const handlePushPermissionYes = useCallback(async () => {
    dismissPrePrompt();
    if (!hasMarketingConsent) {
      dispatch(setDataCollectionForMarketing(true));
    }

    const isPushEnabled = await enableNotifications();
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
    showToast,
  ]);

  const handlePushPermissionNotNow = useCallback(() => {
    dismissPrePrompt();
    showToast(strings('notifications.push_onboarding.toast_settings_hint'));
  }, [dismissPrePrompt, showToast]);

  const handleMarketingConsentConfirm = useCallback(() => {
    dismissPrePrompt();
    dispatch(setDataCollectionForMarketing(true));
    showToast(strings('notifications.push_onboarding.toast_marketing_enabled'));
  }, [dismissPrePrompt, dispatch, showToast]);

  const handleMarketingConsentNotNow = useCallback(() => {
    dismissPrePrompt();
    showToast(strings('notifications.push_onboarding.toast_marketing_hint'));
  }, [dismissPrePrompt, showToast]);

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
