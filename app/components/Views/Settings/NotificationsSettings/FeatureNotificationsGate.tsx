import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { strings } from '../../../../../locales/i18n';

export function useFeatureNotificationsStatus(
  feature: NotificationPreferenceSection,
) {
  const isMasterEnabled = useSelector(selectIsMetamaskNotificationsEnabled);
  const { preferences } = useNotificationStoragePreferences();
  const sectionPrefs = preferences?.[feature];

  return {
    isMasterEnabled,
    isPushEnabled: sectionPrefs?.pushNotificationsEnabled ?? false,
    isInAppEnabled: sectionPrefs?.inAppNotificationsEnabled ?? false,
  };
}

/**
 * When the feature push channel is on but the OS has not granted push, prompt
 * the user: OS dialog if still promptable, otherwise the Settings alert.
 */
export async function promptOsPushPermissionIfNeeded(): Promise<void> {
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

export const FeatureNotificationsGate = ({
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

  const { isMasterEnabled, isPushEnabled, isInAppEnabled } =
    useFeatureNotificationsStatus(feature);

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

  const channelsDisabled = renderMaster && !isMasterEnabled;

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

  // Prompt for OS push when the in-app push channel is on (at open or after
  // the user enables it) but the OS permission is not granted.
  useEffect(() => {
    if (!isPushEnabled) {
      hasPromptedOsPushRef.current = false;
      return;
    }
    if (!isVisible || hasPromptedOsPushRef.current) {
      return;
    }

    hasPromptedOsPushRef.current = true;
    void promptOsPushPermissionIfNeeded();
  }, [isVisible, isPushEnabled]);

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
    <BottomSheet ref={sheetRef} onClose={handleSheetClosed}>
      <BottomSheetHeader onClose={handleHeaderClose}>
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
