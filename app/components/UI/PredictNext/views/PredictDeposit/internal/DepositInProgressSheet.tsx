import React, { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictDepositOperation } from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictDepositScreenTestIds } from '../PredictDepositScreen.testIds';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalHost: {
    height: 0,
    position: 'absolute',
    width: 0,
  },
});

const describeDeposit = (deposit: PredictDepositOperation | null): string => {
  if (!deposit) {
    return strings('predict_next.deposit.in_progress.unknown');
  }
  const amount = formatUsd(deposit.amount);
  switch (deposit.status) {
    case 'awaiting_transfer':
      return strings('predict_next.deposit.in_progress.awaiting_transfer', {
        amount,
      });
    case 'under_review':
      return strings('predict_next.deposit.in_progress.under_review', {
        amount,
        reference:
          deposit.next?.kind === 'review'
            ? deposit.next.supportReference
            : deposit.operationId.slice(0, 8),
      });
    case 'processing':
      return strings('predict_next.deposit.in_progress.processing', {
        amount,
      });
    default:
      return strings('predict_next.deposit.in_progress.unknown');
  }
};

interface DepositInProgressSheetProps {
  /** The open deposit, or null when it could not be read. */
  deposit: PredictDepositOperation | null;
  isCancelling: boolean;
  cancelFailed: boolean;
  onContinue: (deposit: PredictDepositOperation) => void;
  onCancel: (deposit: PredictDepositOperation) => void;
  onClose: () => void;
}

/**
 * The open deposit that blocked a new one (`deposit_in_progress`). A deposit
 * still waiting for its transfer can be paid now or cancelled; any other is
 * only shown. The status line that opens this sheet from Home and Portfolio,
 * resume and observation are PRED-1189.
 */
export const DepositInProgressSheet = ({
  deposit,
  isCancelling,
  cancelFailed,
  onContinue,
  onCancel,
  onClose,
}: DepositInProgressSheetProps): React.JSX.Element => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);
  const payable =
    deposit?.status === 'awaiting_transfer' &&
    deposit.next?.kind === 'wallet_transfer'
      ? deposit
      : null;
  const cancelFailedText = cancelFailed
    ? strings('predict_next.deposit.in_progress.cancel_failed')
    : undefined;

  // VoiceOver ignores RN live regions on iOS, so announce the failure when it
  // appears after Cancel.
  useEffect(() => {
    if (cancelFailedText) {
      AccessibilityInfo.announceForAccessibility(cancelFailedText);
    }
  }, [cancelFailedText]);

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <BottomSheet
              ref={sheetRef}
              onClose={onClose}
              testID={PredictDepositScreenTestIds.IN_PROGRESS}
            >
              <BottomSheetHeader onClose={close}>
                {strings('predict_next.deposit.in_progress.title')}
              </BottomSheetHeader>
              <Box twClassName="gap-4 px-4 pb-6">
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {describeDeposit(deposit)}
                </Text>
                {cancelFailedText ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    accessibilityRole="alert"
                  >
                    {cancelFailedText}
                  </Text>
                ) : null}
                {payable ? (
                  <Box twClassName="gap-3">
                    <Button
                      variant={ButtonVariant.Primary}
                      size={ButtonSize.Lg}
                      isFullWidth
                      isDisabled={isCancelling}
                      onPress={() => onContinue(payable)}
                      testID={PredictDepositScreenTestIds.IN_PROGRESS_CONTINUE}
                    >
                      {strings('predict_next.deposit.in_progress.continue')}
                    </Button>
                    <Button
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Lg}
                      isFullWidth
                      isLoading={isCancelling}
                      isDisabled={isCancelling}
                      onPress={() => onCancel(payable)}
                      testID={PredictDepositScreenTestIds.IN_PROGRESS_CANCEL}
                    >
                      {strings('predict_next.deposit.in_progress.cancel')}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    onPress={close}
                    testID={PredictDepositScreenTestIds.IN_PROGRESS_CLOSE}
                  >
                    {strings('predict_next.deposit.in_progress.close')}
                  </Button>
                )}
              </Box>
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};
