import { useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ApprovalType } from '@metamask/controller-utils';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import {
  useHardwareWallet,
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
  } = useHardwareWallet();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  // Determine if the current confirmation is for a Ledger account
  // This uses the `from` address from the approval request instead of
  // the currently selected account to correctly handle edge cases where they
  // might differ.
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
        navigation.navigate(Routes.WALLET_VIEW);
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

  const hasRejectedRef = useRef(false);

  const executeApproval = useCallback(async () => {
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

    if (isSignatureReq && approvalRequest?.id) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse(approvalRequest.id);
    }
  }, [
    approvalType,
    onRequestConfirm,
    navigation,
    isSignatureReq,
    approvalRequest?.id,
    captureSignatureMetrics,
  ]);

  const onConfirm = useCallback(async () => {
    if (isLedgerAccount) {
      hasRejectedRef.current = false;

      const rejectOnce = () => {
        if (hasRejectedRef.current) return;
        hasRejectedRef.current = true;
        onReject();
      };

      try {
        const deviceId = await getDeviceId();
        const isReady = await ensureDeviceReady(deviceId);

        if (!isReady) {
          return;
        }

        const operationType = isTransactionReq ? 'transaction' : 'message';
        showAwaitingConfirmation(operationType, () => {
          rejectOnce();
        });

        if (isTransactionReq) {
          await onTransactionConfirm({
            onError: (err) => {
              throw err;
            },
          });
        } else {
          await executeApproval();
        }

        hideAwaitingConfirmation();
      } catch (err) {
        hideAwaitingConfirmation();

        if (!isUserCancellation(err)) {
          showHardwareWalletError(err);
        }

        rejectOnce();
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

    await executeApproval();
  }, [
    isLedgerAccount,
    isSigningQRObject,
    isTransactionReq,
    setScannerVisible,
    onTransactionConfirm,
    executeApproval,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    onReject,
    ensureDeviceReady,
  ]);

  return { onConfirm, onReject };
};
