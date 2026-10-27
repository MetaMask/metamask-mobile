import React, { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import type { XAuthError } from '../../../../core/XAuthService';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

const styles = StyleSheet.create({
  sheetContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
});

interface DisconnectXAccountSheetProps {
  /** X username without the leading `@`. */
  handle?: string;
  isDisconnecting: boolean;
  onClose: () => void;
  /** Resolves with the error if the disconnect failed, `undefined` on success. */
  onConfirm: () => Promise<XAuthError | undefined>;
}

/** Confirmation sheet shown before unlinking the X account. */
const DisconnectXAccountSheet = ({
  handle,
  isDisconnecting,
  onClose,
  onConfirm,
}: DisconnectXAccountSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    if (isDisconnecting) {
      return;
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [isDisconnecting]);

  const handleConfirm = useCallback(async () => {
    if (isDisconnecting) {
      return;
    }
    setErrorMessage(null);
    const result = await onConfirm();
    if (result) {
      setErrorMessage(strings('manage_profile.x_account_disconnect_error'));
    }
  }, [isDisconnecting, onConfirm]);

  const handleConfirmPress = useCallback(() => {
    handleConfirm().catch(() => undefined);
  }, [handleConfirm]);

  const body = handle
    ? strings('manage_profile.x_account_disconnect_sheet_body', {
        handle: `@${handle}`,
      })
    : strings('manage_profile.x_account_disconnect_sheet_body_no_handle');

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={dismiss}
    >
      <BottomSheet
        ref={sheetRef}
        isFullscreen={false}
        keyboardAvoidingViewEnabled={false}
        goBack={onClose}
        testID={ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_SHEET}
      >
        <BottomSheetHeader onClose={dismiss}>
          {strings('manage_profile.x_account_disconnect_sheet_title')}
        </BottomSheetHeader>
        <Box twClassName="px-4 pb-4" gap={2} style={styles.sheetContent}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {body}
          </Text>
          {errorMessage ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              testID={ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_ERROR}
            >
              {errorMessage}
            </Text>
          ) : null}
        </Box>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          secondaryButtonProps={{
            children: strings('manage_profile.cancel'),
            isDisabled: isDisconnecting,
            onPress: dismiss,
            testID: ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
          }}
          primaryButtonProps={{
            children: strings('manage_profile.x_account_disconnect'),
            isDanger: true,
            isLoading: isDisconnecting,
            isDisabled: isDisconnecting,
            onPress: handleConfirmPress,
            testID: ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CONFIRM,
          }}
        />
      </BottomSheet>
    </Modal>
  );
};

export default DisconnectXAccountSheet;
