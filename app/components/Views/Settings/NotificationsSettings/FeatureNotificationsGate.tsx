import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
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

export interface FeatureNotificationsGateProps {
  feature: NotificationPreferenceSection;
  /** Called when user dismisses the sheet without satisfying the gate condition. */
  onDismiss?: () => void;
}

export const FeatureNotificationsGate = ({
  feature,
  onDismiss,
}: FeatureNotificationsGateProps) => {
  const { isMasterEnabled, isPushEnabled, isInAppEnabled } =
    useFeatureNotificationsStatus(feature);

  // Feature is blocked while master is off OR both channels are off.
  // Master on + at least one channel on is a valid state for using features.
  // isMasterEnabled is synchronous Redux so no async race for the master condition.
  const isFeatureBlocked =
    !isMasterEnabled || (!isPushEnabled && !isInAppEnabled);

  // Auto-dismiss has a stricter bar: master AND both channels on.
  const isFullyEnabled = isMasterEnabled && isPushEnabled && isInAppEnabled;

  // Snapshot which sections to render at mount — frozen for the session.
  const [renderMaster] = useState(!isMasterEnabled);
  const [renderChannels] = useState(!isPushEnabled && !isInAppEnabled);

  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(isFeatureBlocked);

  // Channels are disabled while the master toggle is also rendered but still off.
  const channelsDisabled = renderMaster && !isMasterEnabled;

  // Open the sheet after it mounts.
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  // Auto-close only once everything is enabled. With one channel on the sheet
  // stays open, but dismissing it manually is fine (see handleSheetClosed).
  useEffect(() => {
    if (isFullyEnabled && isVisible) {
      sheetRef.current?.onCloseBottomSheet(() => setIsVisible(false));
    }
  }, [isFullyEnabled, isVisible]);

  // X button: only start the close animation — dismiss logic lives in handleSheetClosed.
  const handleHeaderClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  // Fires once after the close animation completes (system or user).
  // Navigate back only if the feature is still blocked — on a system close it
  // never is, and a manual dismiss with one channel on is a valid state.
  const handleSheetClosed = () => {
    setIsVisible(false);
    if (isFeatureBlocked) {
      onDismiss?.();
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
