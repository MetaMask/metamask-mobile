import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  Box,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import ErrorStateContent from '../../UI/ErrorStateContent';
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
      <Box twClassName="px-4 pb-6 pt-6">
        <ErrorStateContent
          title={strings('manual_backup_step_2.error-title')}
          description={strings('manual_backup_step_2.error-description')}
          titleTestID={
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TITLE
          }
          descriptionTestID={
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_DESCRIPTION
          }
        />
      </Box>
      <FooterGlass
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
