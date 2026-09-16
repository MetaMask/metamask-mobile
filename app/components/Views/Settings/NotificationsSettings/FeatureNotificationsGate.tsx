import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import { useFeatureNotificationsStatus } from './hooks/useFeatureNotificationsStatus';
import type { FeatureNotificationsGateFeature } from './featureNotificationsGateConfig';

/**
 * When the feature push channel is on but the OS has not granted push, prompt
 * the user: OS dialog if still promptable, otherwise the Settings alert.
 */
async function promptOsPushPermissionIfNeeded(): Promise<void> {
  if (await isPushPermissionGranted()) {
    return;
  }

  if (await isPushPermissionPromptable()) {
    await requestPushPermissions();
    return;
  }

  await NotificationService.requestPushNotificationsPermission();
}

interface FeatureNotificationsGateStatus {
  isFeatureBlocked: boolean;
  isPushEnabled: boolean;
  /**
   * An unsettled preferences read is indistinguishable from "every channel is
   * off", so nothing may act until the query has an answer.
   */
  isPreferencesReady: boolean;
}

/**
 * Presents the FeatureNotificationsGateSheet route while the gate is blocked,
 * and dismisses the host screen if the sheet is closed without satisfying
 * the gate.
 *
 * The sheet lives on the root modal stack and cannot be observed directly;
 * focus is the signal instead. Presenting the sheet takes focus away from
 * the host screen, and closing it gives focus back. So whenever the host
 * screen is focused while the gate is blocked, only two things can be true:
 *
 * - No sheet was presented yet → present it.
 * - A sheet was presented → it just closed, still blocked → dismiss.
 */
function useGateSheetPresentation({
  feature,
  autoDismiss,
  onDismiss,
  status,
}: {
  feature: FeatureNotificationsGateFeature;
  autoDismiss?: boolean;
  onDismiss?: () => void;
  status: FeatureNotificationsGateStatus;
}) {
  const navigation = useNavigation<AppStackNavigationProp>();
  const isFocused = useIsFocused();
  const { isFeatureBlocked, isPreferencesReady } = status;

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
      return;
    }
    navigation.goBack();
  }, [onDismiss, navigation]);

  const wasSheetPresentedRef = useRef(false);

  useEffect(() => {
    if (!isPreferencesReady || !isFeatureBlocked || !isFocused) {
      return;
    }

    if (wasSheetPresentedRef.current) {
      handleDismiss();
      return;
    }

    wasSheetPresentedRef.current = true;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.FEATURE_NOTIFICATIONS_GATE,
      params: { feature, autoDismiss },
    });
  }, [
    isPreferencesReady,
    isFocused,
    isFeatureBlocked,
    handleDismiss,
    navigation,
    feature,
    autoDismiss,
  ]);
}

/**
 * Prompts for the OS push permission whenever the feature push channel is on
 * but the OS permission is missing. Independent of the gate sheet: master and
 * push already on means the sheet never opens, but the user still needs the OS
 * permission to actually get notified.
 *
 * Prompts once per push-channel activation: turning push off arms the prompt
 * again for the next time it turns on.
 */
function useOsPushPermissionPrompt({
  isPushEnabled,
  isPreferencesReady,
}: FeatureNotificationsGateStatus) {
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (!isPushEnabled) {
      hasPromptedRef.current = false;
      return;
    }

    if (!isPreferencesReady || hasPromptedRef.current) {
      return;
    }

    hasPromptedRef.current = true;
    // Defer so the sheet's open animation does not swallow the OS Alert.
    InteractionManager.runAfterInteractions(() => {
      void promptOsPushPermissionIfNeeded();
    });
  }, [isPushEnabled, isPreferencesReady]);
}

export interface FeatureNotificationsGateProps {
  feature: FeatureNotificationsGateFeature;
  /**
   * Called when user dismisses the sheet without satisfying the gate condition.
   * Defaults to `navigation.goBack()`.
   */
  onDismiss?: () => void;
  /**
   * When true, closes the sheet once the gate condition is satisfied.
   * Defaults to `true`.
   */
  autoDismiss?: boolean;
}

/**
 * Renders nothing; when the feature's notifications are not fully enabled it
 * presents the FeatureNotificationsGateSheet route over the current screen,
 * and calls `onDismiss` (default: `navigation.goBack()`) if the user closes
 * the sheet without satisfying the gate.
 *
 * Mount this only on a screen that intends to stay. A screen that
 * may still redirect on its own (e.g. replace itself after a fetch) must not
 * mount the gate until that decision is made — a sheet presented by a screen
 * that then disappears is orphaned, and the replacing screen's gate will
 * re-present it once instead of dismissing on give-up.
 */
export const FeatureNotificationsGate = ({
  feature,
  onDismiss,
  autoDismiss,
}: FeatureNotificationsGateProps) => {
  const {
    isMasterEnabled,
    isPushEnabled,
    isInAppEnabled,
    hasNotificationPreferences,
    isPreferencesLoading,
  } = useFeatureNotificationsStatus(feature);

  const status: FeatureNotificationsGateStatus = {
    isFeatureBlocked: !isMasterEnabled || (!isPushEnabled && !isInAppEnabled),
    isPushEnabled,
    isPreferencesReady: hasNotificationPreferences && !isPreferencesLoading,
  };

  useGateSheetPresentation({ feature, autoDismiss, onDismiss, status });
  useOsPushPermissionPrompt(status);

  return null;
};
