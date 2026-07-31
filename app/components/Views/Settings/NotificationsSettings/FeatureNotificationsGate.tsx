import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';
import { NotificationSettingsSectionContent } from './NotificationSettingsSectionContent';
import { MainNotificationToggle } from './MainNotificationToggle';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { strings } from '../../../../../locales/i18n';

function useFeatureNotificationsStatus(feature: NotificationPreferenceSection) {
  const isMasterEnabled = useSelector(selectIsMetamaskNotificationsEnabled);
  const { preferences, hasNotificationPreferences, isLoading } =
    useNotificationStoragePreferences();
  const sectionPrefs = preferences?.[feature];

  return {
    isMasterEnabled,
    isPushEnabled: sectionPrefs?.pushNotificationsEnabled ?? false,
    isInAppEnabled: sectionPrefs?.inAppNotificationsEnabled ?? false,
    hasNotificationPreferences,
    isPreferencesLoading: isLoading,
  };
}

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

export interface FeatureNotificationsGateSheetParams {
  feature: NotificationPreferenceSection;
  /**
   * When true, closes the sheet once the gate condition is satisfied.
   * Defaults to `true`.
   */
  autoDismiss?: boolean;
}

type FeatureNotificationsGateSheetRouteProp = RouteProp<
  { params: FeatureNotificationsGateSheetParams },
  'params'
>;

/**
 * The gate bottom sheet, registered as a `transparentModal` route in the root
 * modal flow. Living on the root stack guarantees it renders above all screen
 * content — no zIndex, native Modal, or sibling-order tricks — and survives
 * navigation happening underneath it.
 *
 * Do not navigate here directly; render {@link FeatureNotificationsGate}
 * inside the gated screen instead.
 */
export const FeatureNotificationsGateSheet = () => {
  const navigation = useNavigation();
  const { params } = useRoute<FeatureNotificationsGateSheetRouteProp>();
  const { feature, autoDismiss = true } = params;

  const { isMasterEnabled, isPushEnabled, isInAppEnabled } =
    useFeatureNotificationsStatus(feature);

  const isFullyEnabled = isMasterEnabled && isPushEnabled && isInAppEnabled;

  // Snapshot which sections to render at mount — frozen for the mount.
  const [renderMaster] = useState(!isMasterEnabled);
  const [renderChannels] = useState(!isPushEnabled && !isInAppEnabled);

  // Master-only sheet: at least one channel was already on at mount, so turning
  // master on is enough
  const isMasterOnlySatisfied =
    renderMaster && !renderChannels && isMasterEnabled;

  const shouldAutoClose = isFullyEnabled || isMasterOnlySatisfied;

  const sheetRef = useRef<BottomSheetRef>(null);
  const channelsDisabled = renderMaster && !isMasterEnabled;

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  useEffect(() => {
    if (autoDismiss && shouldAutoClose) {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [autoDismiss, shouldAutoClose]);

  const handleHeaderClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleSheetClosed = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetClosed}
      testID={NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET}
    >
      <BottomSheetHeader
        onClose={handleHeaderClose}
        closeButtonProps={{
          testID:
            NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('notifications.feature_gate.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-4">
        {renderMaster && (
          <MainNotificationToggle
            showDescription={false}
            disabled={isMasterEnabled}
          />
        )}
        {renderChannels && (
          <NotificationSettingsSectionContent
            type={feature}
            disabled={channelsDisabled}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

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
 * Presents {@link FeatureNotificationsGateSheet} while the gate is blocked,
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
  feature: NotificationPreferenceSection;
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
  feature: NotificationPreferenceSection;
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
 * presents {@link FeatureNotificationsGateSheet} over the current screen, and
 * calls `onDismiss` (default: `navigation.goBack()`) if the user closes the
 * sheet without satisfying the gate.
 *
 * Note: mount this only on a screen that intends to stay. A screen that
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
