import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  IconAlertSeverity,
  Text,
  TextColor,
  TextVariant,
  TitleAlert,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { PasswordResetWarningSheetSelectorsIDs } from './PasswordResetWarningSheet.testIds';

export interface PasswordResetWarningSheetProps {
  isVisible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Warning bottom sheet shown before creating a wallet with an SRP, reminding
 * the user that MetaMask cannot reset the password they just chose.
 */
const PasswordResetWarningSheet = ({
  isVisible,
  onConfirm,
  onDismiss,
}: PasswordResetWarningSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback((callback: () => void) => {
    if (!sheetRef.current) {
      callback();
      return;
    }
    sheetRef.current.onCloseBottomSheet(callback);
  }, []);

  const handleClose = useCallback(() => {
    closeSheet(onDismiss);
  }, [closeSheet, onDismiss]);

  const handleConfirm = useCallback(() => {
    closeSheet(onConfirm);
  }, [closeSheet, onConfirm]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      keyboardAvoidingViewEnabled={false}
      onClose={onDismiss}
      testID={PasswordResetWarningSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PasswordResetWarningSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />
      <Box twClassName="px-4 pb-2 gap-2">
        <TitleAlert
          severity={IconAlertSeverity.Danger}
          title={strings('choose_password.password_warning_title')}
          titleProps={{
            variant: TextVariant.HeadingMd,
            testID: PasswordResetWarningSheetSelectorsIDs.TITLE,
          }}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PasswordResetWarningSheetSelectorsIDs.DESCRIPTION}
        >
          {strings('choose_password.password_warning_description_part1')}
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
          >
            {strings('choose_password.password_warning_srp')}
          </Text>
          {strings('choose_password.password_warning_description_part2')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={{
          children: strings('choose_password.password_warning_confirm'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          testID: PasswordResetWarningSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
        secondaryButtonProps={{
          children: strings('choose_password.password_warning_cancel'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: PasswordResetWarningSheetSelectorsIDs.CANCEL_BUTTON,
        }}
        twClassName="flex-col-reverse gap-4"
      />
    </BottomSheet>
  );
};

export default PasswordResetWarningSheet;
