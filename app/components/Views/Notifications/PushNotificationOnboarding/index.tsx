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
import { markPushPrePromptPerformance } from '../../../../util/notifications/utils/push-pre-prompt-performance';
import type { CompleteSurfaceReason } from '../../../Nav/Main/StartupSurfaceCoordinator/context';

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
    markPushPrePromptPerformance('component.mounted');

    return () => {
      markPushPrePromptPerformance('component.unmounted');
    };
  }, []);

  useEffect(() => {
    markPushPrePromptPerformance('component.variant.changed', {
      variant: prePromptVariant ?? 'null',
    });
  }, [prePromptVariant]);

  useEffect(() => {
    if (
      !isVisible ||
      !prePromptVariant ||
      viewedPrePromptVariant.current === prePromptVariant
    ) {
      return;
    }

    viewedPrePromptVariant.current = prePromptVariant;
    markPushPrePromptPerformance('component.variant.viewed', {
      variant: prePromptVariant,
    });
    markPrePromptShown()
      .then(() => {
        markPushPrePromptPerformance('component.mark_shown.resolved', {
          variant: prePromptVariant,
        });
      })
      .catch((error) => {
        markPushPrePromptPerformance('component.mark_shown.failed', {
          error: error instanceof Error ? error.message : String(error),
          variant: prePromptVariant,
        });
      });
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
    const startedAt = Date.now();
    let nativePermissionEnabled = false;
    markPushPrePromptPerformance('push_pre_prompt.yes.start');
    onPendingActionStart('push_permission');
    trackPrePromptButtonClicked('push_permission', 'yes');
    try {
      if (!hasMarketingConsent) {
        dispatch(setDataCollectionForMarketing(true));
        const identifyStartedAt = Date.now();
        markPushPrePromptPerformance(
          'push_pre_prompt.marketing_identify.start',
        );
        void identifyMarketingConsent(true)
          .then(() => {
            markPushPrePromptPerformance(
              'push_pre_prompt.marketing_identify.end',
              {
                durationMs: Date.now() - identifyStartedAt,
                success: true,
              },
            );
          })
          .catch((error) => {
            markPushPrePromptPerformance(
              'push_pre_prompt.marketing_identify.end',
              {
                durationMs: Date.now() - identifyStartedAt,
                error: error instanceof Error ? error.message : String(error),
                success: false,
              },
            );
          });
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
      markPushPrePromptPerformance('push_pre_prompt.yes.end', {
        durationMs: Date.now() - startedAt,
        nativePermissionEnabled,
      });
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
