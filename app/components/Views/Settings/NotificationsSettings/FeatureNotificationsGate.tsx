import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';
import { NotificationSectionContent } from './NotificationSectionContent';
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

export interface FeatureNotificationsGateProps {
  feature: NotificationPreferenceSection;
  /**
   * Called when user dismisses the sheet without satisfying the gate condition.
   * Defaults to `navigation.goBack()`.
   */
  onDismiss?: () => void;
}

const FeatureNotificationsGateSheet = ({
  feature,
  onDismiss,
}: FeatureNotificationsGateProps) => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
      return;
    }
    navigation.goBack();
  }, [onDismiss, navigation]);

  const {
    isMasterEnabled,
    isPushEnabled,
    isInAppEnabled,
    hasNotificationPreferences,
    isPreferencesLoading,
  } = useFeatureNotificationsStatus(feature);

  const isFeatureBlocked =
    !isMasterEnabled || (!isPushEnabled && !isInAppEnabled);

  const isFullyEnabled = isMasterEnabled && isPushEnabled && isInAppEnabled;

  // Snapshot which sections to render at mount — frozen for the mount.
  const [renderMaster] = useState(!isMasterEnabled);
  const [renderChannels] = useState(!isPushEnabled && !isInAppEnabled);

  // Master-only sheet: at least one channel was already on at mount, so turning
  // master on is enough — there is no other toggle left to act on.
  const isMasterOnlySatisfied =
    renderMaster && !renderChannels && isMasterEnabled;

  const shouldAutoClose = isFullyEnabled || isMasterOnlySatisfied;

  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(isFeatureBlocked);
  const hasPromptedOsPushRef = useRef(false);
  const isPushEnabledRef = useRef(isPushEnabled);
  isPushEnabledRef.current = isPushEnabled;

  const channelsDisabled = renderMaster && !isMasterEnabled;

  const promptOsPushIfNeeded = useCallback(() => {
    if (!isPushEnabledRef.current || hasPromptedOsPushRef.current) {
      return;
    }

    hasPromptedOsPushRef.current = true;
    // Defer so the BottomSheet open animation does not swallow the OS Alert.
    InteractionManager.runAfterInteractions(() => {
      void promptOsPushPermissionIfNeeded();
    });
  }, []);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  useEffect(() => {
    if (shouldAutoClose && isVisible) {
      sheetRef.current?.onCloseBottomSheet(() => setIsVisible(false));
    }
  }, [shouldAutoClose, isVisible]);

  // Reset so turning push off then on again can re-prompt.
  useEffect(() => {
    if (!isPushEnabled) {
      hasPromptedOsPushRef.current = false;
    }
  }, [isPushEnabled]);

  // Prompt whenever the push channel is on and prefs are ready — independent of
  // sheet visibility. Master+push already on means the sheet never opens, but
  // the user still needs the OS permission prompt to actually get notified.
  useEffect(() => {
    if (!hasNotificationPreferences || isPreferencesLoading) {
      return;
    }
    if (!isPushEnabled) {
      return;
    }

    promptOsPushIfNeeded();
  }, [
    isPushEnabled,
    hasNotificationPreferences,
    isPreferencesLoading,
    promptOsPushIfNeeded,
  ]);

  const handleHeaderClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleSheetClosed = () => {
    setIsVisible(false);
    if (isFeatureBlocked) {
      handleDismiss();
    }
  };

  if (!isVisible) return null;

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
          <NotificationSectionContent
            type={feature}
            disabled={channelsDisabled}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

export const FeatureNotificationsGate = ({
  feature,
  onDismiss,
}: FeatureNotificationsGateProps) => {
  const { isLoading } = useNotificationStoragePreferences();

  // The sheet freezes its layout on first render, so it must not mount until the
  // preferences query has an answer — an unsettled read is indistinguishable
  // from "every channel is off".
  if (isLoading) return null;

  return (
    <FeatureNotificationsGateSheet feature={feature} onDismiss={onDismiss} />
  );
};
