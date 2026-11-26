import React, { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Modal, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
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
import type { DepositEnvironmentResolution } from './DepositEnvironment';

// ButtonIconSize.Xs is 20pt; 12pt on each side makes a 44pt target.
const COPY_BUTTON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalHost: {
    height: 0,
    position: 'absolute',
    width: 0,
  },
  referenceText: {
    writingDirection: 'ltr',
  },
});

const getSupportReference = (deposit: PredictDepositOperation): string =>
  deposit.next?.kind === 'review'
    ? deposit.next.supportReference
    : deposit.operationId;

const copySupportReference = (reference: string): void => {
  Clipboard.setString(reference);
  AccessibilityInfo.announceForAccessibility(
    strings('predict_next.deposit.status.reference_copied'),
  );
};

const describeDeposit = (
  deposit: PredictDepositOperation | null,
  hasSubmittedTransfer = false,
): string => {
  if (!deposit) {
    return strings('predict_next.deposit.in_progress.unknown');
  }
  const amount = formatUsd(deposit.amount);
  switch (deposit.status) {
    case 'awaiting_transfer':
      return strings(
        hasSubmittedTransfer
          ? 'predict_next.deposit.in_progress.processing'
          : 'predict_next.deposit.in_progress.awaiting_transfer',
        {
          amount,
        },
      );
    case 'under_review':
      return strings('predict_next.deposit.in_progress.under_review', {
        amount,
        reference: getSupportReference(deposit),
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
  /** Whether a transfer for this deposit already went out and only needs reporting. */
  hasSubmittedTransfer?: boolean;
  /** Resolved catalog deposit environment (drives availability copy and retry). */
  environmentResolution: DepositEnvironmentResolution;
  /** Whether Continue is allowed (disabled while deposit environment is loading/unavailable unless a transfer already went out). */
  canContinue?: boolean;
  /** Whether Cancel is allowed (disabled when the sent-or-not state cannot be checked). */
  canCancel?: boolean;
  /** Controls modal visibility without unmounting the sheet host mid-action. */
  isVisible?: boolean;
  isCancelling: boolean;
  cancelFailed: boolean;
  onContinue: (deposit: PredictDepositOperation) => void;
  onCancel: (deposit: PredictDepositOperation) => void;
  onClose: () => void;
}

/**
 * The open deposit that blocked a new one (`deposit_in_progress`). A deposit
 * still waiting for its transfer can be paid now or cancelled; one whose
 * transfer already went out can only continue to report its hash; any other is
 * only shown. The status line that opens this sheet from Home and Portfolio,
 * resume and observation are PRED-1189.
 */
export const DepositInProgressSheet = ({
  deposit,
  hasSubmittedTransfer = false,
  environmentResolution,
  canContinue = true,
  canCancel = true,
  isVisible = true,
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
  const needsEnvironmentToContinue = payable !== null && !hasSubmittedTransfer;
  const reviewReference =
    deposit?.status === 'under_review' ? getSupportReference(deposit) : null;
  const cancelFailedText = cancelFailed
    ? strings('predict_next.deposit.in_progress.cancel_failed')
    : undefined;
  let unavailableText: string | undefined;
  if (
    needsEnvironmentToContinue &&
    environmentResolution.status === 'unavailable'
  ) {
    unavailableText =
      environmentResolution.reason === 'error'
        ? strings('predict_next.deposit.unavailable_error')
        : strings('predict_next.deposit.unavailable');
  }

  // VoiceOver ignores RN live regions on iOS, so announce the failure when it
  // appears after Cancel.
  useEffect(() => {
    if (cancelFailedText) {
      AccessibilityInfo.announceForAccessibility(cancelFailedText);
    }
  }, [cancelFailedText]);

  useEffect(() => {
    if (isVisible && unavailableText) {
      AccessibilityInfo.announceForAccessibility(unavailableText);
    }
  }, [isVisible, unavailableText]);

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible={isVisible}
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
              <Box className="gap-4 px-4 pb-6">
                {reviewReference && deposit ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                      className="shrink"
                    >
                      {strings(
                        'predict_next.deposit.in_progress.under_review_label',
                        {
                          amount: formatUsd(deposit.amount),
                        },
                      )}{' '}
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                        style={styles.referenceText}
                      >
                        {reviewReference}
                      </Text>
                    </Text>
                    <ButtonIcon
                      iconName={IconName.Copy}
                      size={ButtonIconSize.Xs}
                      iconProps={{ color: IconColor.IconAlternative }}
                      hitSlop={COPY_BUTTON_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={strings(
                        'predict_next.deposit.status.copy_reference',
                      )}
                      onPress={() => copySupportReference(reviewReference)}
                      testID={
                        PredictDepositScreenTestIds.IN_PROGRESS_COPY_REFERENCE
                      }
                    />
                  </Box>
                ) : (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {describeDeposit(deposit, hasSubmittedTransfer)}
                  </Text>
                )}
                {cancelFailedText ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    accessibilityRole="alert"
                  >
                    {cancelFailedText}
                  </Text>
                ) : null}
                {needsEnvironmentToContinue &&
                environmentResolution.status === 'loading' ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={PredictDepositScreenTestIds.IN_PROGRESS_LOADING}
                  >
                    {strings(
                      'predict_next.deposit.in_progress.checking_availability',
                    )}
                  </Text>
                ) : null}
                {unavailableText ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    accessibilityRole="alert"
                    testID={PredictDepositScreenTestIds.IN_PROGRESS_ALERT}
                  >
                    {unavailableText}
                  </Text>
                ) : null}
                {payable ? (
                  <Box className="gap-3">
                    <Button
                      variant={ButtonVariant.Primary}
                      size={ButtonSize.Lg}
                      isFullWidth
                      isDisabled={isCancelling || !canContinue}
                      onPress={() => onContinue(payable)}
                      testID={PredictDepositScreenTestIds.IN_PROGRESS_CONTINUE}
                    >
                      {strings('predict_next.deposit.in_progress.continue')}
                    </Button>
                    {needsEnvironmentToContinue &&
                    environmentResolution.status === 'unavailable' &&
                    environmentResolution.reason === 'error' ? (
                      <Button
                        variant={ButtonVariant.Secondary}
                        size={ButtonSize.Lg}
                        isFullWidth
                        isDisabled={isCancelling}
                        onPress={environmentResolution.retry}
                        testID={PredictDepositScreenTestIds.IN_PROGRESS_RETRY}
                      >
                        {strings('predict_next.deposit.retry')}
                      </Button>
                    ) : null}
                    {hasSubmittedTransfer || !canCancel ? null : (
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
                    )}
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
