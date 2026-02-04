import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ApprovalType } from '@metamask/controller-utils';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import {
  useHardwareWalletActions,
  isUserCancellation,
} from '../../../../core/HardwareWallet';
import { isHardwareAccount } from '../../../../util/address';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import { getDeviceId } from '../../../../core/Ledger/Ledger';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const { cancelQRScanRequestIfPresent, isSigningQRObject, setScannerVisible } =
    useQRHardwareContext();
  const {
    ensureDeviceReady,
    showHardwareWalletError,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
  } = useHardwareWalletActions();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  // Determine if the current confirmation is for a Ledger account
  // This uses the `from` address from the approval request, NOT the currently selected account,
  // to correctly handle edge cases where they might differ
  const isLedgerAccount = useMemo(() => {
    const fromAddress =
      (approvalRequest?.requestData?.from as string) ||
      (transactionMetadata?.txParams?.from as string);
    if (!fromAddress) return false;
    return isHardwareAccount(fromAddress, [ExtendedKeyringTypes.ledger]);
  }, [approvalRequest?.requestData?.from, transactionMetadata?.txParams?.from]);

  const onReject = useCallback(
    async (error?: Error, skipNavigation = false, navigateToHome = false) => {
      await cancelQRScanRequestIfPresent();
      onRequestReject(error);
      if (!skipNavigation) {
        navigation.goBack();
      }
      if (navigateToHome) {
        navigation.navigate(Routes.WALLET.HOME, {
          screen: Routes.WALLET.TAB_STACK_FLOW,
          params: {
            screen: Routes.WALLET_VIEW,
          },
        });
      }
      if (isSignatureReq && approvalRequest?.id) {
        captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
        PPOMUtil.clearSignatureSecurityAlertResponse(approvalRequest.id);
      }
    },
    [
      cancelQRScanRequestIfPresent,
      captureSignatureMetrics,
      navigation,
      onRequestReject,
      isSignatureReq,
      approvalRequest?.id,
    ],
  );

  const onConfirm = useCallback(async () => {
    if (isLedgerAccount) {
      // Get the stored device ID from keyring to reconnect to the same device
      const deviceId = await getDeviceId();

      // Show bottom sheet and ensure device is connected + Eth app open
      // Wallet type is auto-derived from the selected Ledger account
      const isReady = await ensureDeviceReady(deviceId ?? undefined);

      if (!isReady) {
        // User cancelled or error was shown - don't proceed
        return;
      }

      // Device is ready - show "awaiting confirmation" UI
      // The onReject callback will be called if user presses the Reject button
      const operationType = isTransactionReq ? 'transaction' : 'message';
      showAwaitingConfirmation(operationType, () => {
        // User pressed Reject in the bottom sheet
        onReject();
      });

      // Perform signing
      try {
        if (isTransactionReq) {
          await onTransactionConfirm();
        } else {
          const waitForResult = approvalType !== ApprovalType.TransactionBatch;
          await onRequestConfirm({
            waitForResult,
            deleteAfterResult: true,
            handleErrors: false,
          });

          if (approvalType === ApprovalType.TransactionBatch) {
            navigation.navigate(Routes.TRANSACTIONS_VIEW);
          } else {
            navigation.goBack();
          }

          if (isSignatureReq) {
            captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
            PPOMUtil.clearSignatureSecurityAlertResponse(approvalRequest?.id);
          }
        }
        // Success - hide the awaiting confirmation UI
        hideAwaitingConfirmation();
      } catch (err) {
        // Hide the awaiting confirmation UI first
        hideAwaitingConfirmation();

        // Only show error if it's not a user cancellation on the device
        if (!isUserCancellation(err)) {
          showHardwareWalletError(err);
        }
        // Reject the transaction
        onReject();
      }
      return;
    }

    if (isSigningQRObject) {
      setScannerVisible(true);
      return;
    }

    if (isTransactionReq) {
      await onTransactionConfirm();
      return;
    }

    const waitForResult = approvalType !== ApprovalType.TransactionBatch;

    await onRequestConfirm({
      waitForResult,
      deleteAfterResult: true,
      handleErrors: false,
    });

    if (approvalType === ApprovalType.TransactionBatch) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
      return;
    }

    navigation.goBack();

    if (isSignatureReq && approvalRequest?.id) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse(approvalRequest.id);
    }
  }, [
    isLedgerAccount,
    isSigningQRObject,
    isTransactionReq,
    onRequestConfirm,
    navigation,
    isSignatureReq,
    setScannerVisible,
    onTransactionConfirm,
    captureSignatureMetrics,
    approvalType,
    approvalRequest?.id,
    ensureDeviceReady,
    showHardwareWalletError,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    onReject,
  ]);

  return { onConfirm, onReject };
};
