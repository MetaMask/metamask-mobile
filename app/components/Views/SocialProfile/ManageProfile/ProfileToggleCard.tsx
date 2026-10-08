import React, { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Switch,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

// Box always applies `flex: 1`. This comes after that class so the sheet hugs
// its title and description instead of filling the screen.
const styles = StyleSheet.create({
  sheetContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
});

interface ProfileToggleCardProps {
  /** Row label, e.g. "Show trading activity". */
  label: string;
  /** Secondary line describing what the current state means. */
  description: string;
  /** Copy rendered below the card, outside it. */
  helperText?: string;
  isOn: boolean;
  onValueChange: (isOn: boolean) => void;
}

/**
 * A privacy toggle card: label with info affordance, a description of the
 * current state, the switch, and helper copy underneath. Mirrors the layout of
 * `SocialLeaderboard/ManageProfileView`'s trading activity screen.
 */
const ProfileToggleCard = ({
  label,
  description,
  helperText,
  isOn,
  onValueChange,
}: ProfileToggleCardProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleOpenInfo = useCallback(() => {
    setIsInfoOpen(true);
  }, []);

  const handleDismissInfo = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleInfoClosed = useCallback(() => {
    setIsInfoOpen(false);
  }, []);

  return (
    <Box twClassName="px-4 pb-4 pt-2" gap={3}>
      <Box twClassName="rounded-2xl bg-muted px-4 py-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mr-3 flex-1"
            gap={1}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {label}
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              size={ButtonIconSize.Sm}
              onPress={handleOpenInfo}
              accessibilityLabel={strings(
                'app_settings.manage_profile.trading_activity_info',
              )}
              testID={ManageProfileSelectorsIDs.TOGGLE_INFO_BUTTON}
            />
          </Box>
          <Switch
            isOn={isOn}
            onValueChange={onValueChange}
            accessibilityLabel={label}
            testID={ManageProfileSelectorsIDs.FIELD_SWITCH}
          />
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-1"
          testID={ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION}
        >
          {description}
        </Text>
      </Box>
      {helperText ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          testID={ManageProfileSelectorsIDs.TOGGLE_HELPER_TEXT}
        >
          {helperText}
        </Text>
      ) : null}
      {isInfoOpen ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={handleDismissInfo}
        >
          <BottomSheet
            ref={sheetRef}
            isFullscreen={false}
            keyboardAvoidingViewEnabled={false}
            goBack={handleInfoClosed}
            testID={ManageProfileSelectorsIDs.TRADING_ACTIVITY_INFO_SHEET}
          >
            <BottomSheetHeader onClose={handleDismissInfo}>
              {strings('app_settings.manage_profile.show_trading_activity')}
            </BottomSheetHeader>
            <Box twClassName="px-4 pb-4" style={styles.sheetContent}>
              <Text variant={TextVariant.BodyMd}>
                {strings(
                  'app_settings.manage_profile.trading_activity_info_description',
                )}
              </Text>
            </Box>
          </BottomSheet>
        </Modal>
      ) : null}
    </Box>
  );
};

export default ProfileToggleCard;
