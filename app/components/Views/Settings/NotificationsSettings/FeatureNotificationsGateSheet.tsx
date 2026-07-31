import React, { useEffect, useRef, useState } from 'react';
import {
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
import { useFeatureNotificationsStatus } from './hooks/useFeatureNotificationsStatus';
import type { NotificationPreferenceSection } from './hooks/useNotificationStoragePreferences';
import { NotificationSettingsSectionContent } from './NotificationSettingsSectionContent';
import { MainNotificationToggle } from './MainNotificationToggle';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { strings } from '../../../../../locales/i18n';

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
 * Do not navigate here directly; render `FeatureNotificationsGate` inside the
 * gated screen instead.
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
  // master on is enough — there is no other toggle left to act on.
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

  // Runs after every close path (header button, overlay tap, auto-close):
  // pop this sheet route. The gate component on the screen below reacts to
  // regaining focus and decides whether to dismiss that screen too.
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
