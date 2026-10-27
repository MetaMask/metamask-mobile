import React, { useCallback, useRef } from 'react';
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
  /** Localised error line shown under the body; `null` hides it. */
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmation sheet shown before unlinking the X account. */
const DisconnectXAccountSheet = ({
  handle,
  isDisconnecting,
  errorMessage,
  onClose,
  onConfirm,
}: DisconnectXAccountSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(() => {
    if (isDisconnecting) {
      return;
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [isDisconnecting]);

  const handleConfirmPress = useCallback(() => {
    if (isDisconnecting) {
      return;
    }
    onConfirm();
  }, [isDisconnecting, onConfirm]);

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
            children: strings('navigation.cancel'),
            isDisabled: isDisconnecting,
            onPress: dismiss,
            testID: ManageProfileSelectorsIDs.X_ACCOUNT_DISCONNECT_CANCEL,
          }}
          primaryButtonProps={{
            children: strings('common.disconnect'),
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
