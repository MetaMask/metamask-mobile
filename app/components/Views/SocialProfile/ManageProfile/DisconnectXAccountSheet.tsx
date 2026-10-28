import React, { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Modal, StyleSheet } from 'react-native';
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

  // The live region below covers TalkBack, but VoiceOver keeps focus on the
  // Disconnect button and does not re-read a changed sibling. Announce the
  // failure explicitly so both screen readers hear it (WCAG 4.1.3).
  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

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
        // The header and Android back button route through `dismiss`, but the
        // backdrop press and the pan-to-dismiss gesture bypass it. Disabling
        // interaction keeps a confirmed disconnect from being rewound to idle.
        isInteractable={!isDisconnecting}
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
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
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
