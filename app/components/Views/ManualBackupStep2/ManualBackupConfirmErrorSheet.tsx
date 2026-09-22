import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  IconAlertSeverity,
  Text,
  TextColor,
  TextVariant,
  TitleAlert,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { ManualBackupConfirmErrorSheetSelectorsIDs } from './ManualBackupConfirmErrorSheet.testIds';

export interface ManualBackupConfirmErrorSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
}

/**
 * Error bottom sheet shown when the user confirms the SRP in the wrong order.
 */
const ManualBackupConfirmErrorSheet = ({
  isVisible,
  onDismiss,
}: ManualBackupConfirmErrorSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    if (!sheetRef.current) {
      onDismiss();
      return;
    }
    sheetRef.current.onCloseBottomSheet(onDismiss);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      keyboardAvoidingViewEnabled={false}
      onClose={onDismiss}
      testID={ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID:
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_CLOSE_BUTTON,
        }}
      />
      <Box twClassName="px-4 pb-6 gap-2">
        <TitleAlert
          severity={IconAlertSeverity.Danger}
          title={strings('manual_backup_step_2.error-title')}
          titleProps={{
            testID: ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TITLE,
          }}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-left"
          testID={
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_DESCRIPTION
          }
        >
          {strings('manual_backup_step_2.error-description')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('manual_backup_step_2.error-button'),
          onPress: handleClose,
          testID:
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TRY_AGAIN_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default ManualBackupConfirmErrorSheet;
