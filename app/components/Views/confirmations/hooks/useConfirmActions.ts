import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { navigateToActivityAfterConfirmation } from '../../../../util/navigation/navigateToActivityAfterConfirmation';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useIsConfirmationFromLedgerAccount } from './useIsConfirmationFromLedgerAccount';
import { useIsConfirmationFromQrAccount } from '../../../../core/HardwareWallet/hooks/useIsConfirmationFromQrAccount';
import { useLedgerConfirm } from './useLedgerConfirm';
import type { EnsureDeviceReadyOptions } from '../../../../core/HardwareWallet/types';
import { useQrConfirm } from '../../../../core/HardwareWallet/hooks/useQrConfirm';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const transactionMetadata = useTransactionMetadataRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const {
    cancelQRScanRequestIfPresent,
    isSigningQRObject,
    setScannerVisible,
    setSigningConfirmed,
  } = useQRHardwareContext();
  const navigation = useNavigation();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const isLedgerAccount = useIsConfirmationFromLedgerAccount();
  const isQrAccount = useIsConfirmationFromQrAccount();

  const ensureDeviceReadyOptions = useMemo<EnsureDeviceReadyOptions>(
    () => ({
      requireBlindSigning:
        Boolean(isTransactionReq) &&
        transactionMetadata?.type !== TransactionType.simpleSend,
    }),
    [isTransactionReq, transactionMetadata?.type],
  );

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

  const executeApproval = useCallback(async () => {
    const waitForResult = approvalType !== ApprovalType.TransactionBatch;
    await onRequestConfirm({
      waitForResult,
      deleteAfterResult: true,
      handleErrors: false,
    });

    if (approvalType === ApprovalType.TransactionBatch) {
      navigateToActivityAfterConfirmation(navigation);
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

  const sharedConfirmOptions = useMemo(
    () => ({
      fromAddress:
        (approvalRequest?.requestData?.from as string) ||
        (transactionMetadata?.txParams?.from as string),
      onReject,
      onTransactionConfirm,
      executeApproval,
      isTransactionReq: Boolean(isTransactionReq),
      ensureDeviceReadyOptions,
    }),
    [
      approvalRequest?.requestData?.from,
      transactionMetadata?.txParams?.from,
      onReject,
      onTransactionConfirm,
      executeApproval,
      isTransactionReq,
      ensureDeviceReadyOptions,
    ],
  );

  const { onConfirm: onLedgerConfirm } = useLedgerConfirm(sharedConfirmOptions);
  const { onConfirm: onQrConfirm } = useQrConfirm(sharedConfirmOptions);

  const onConfirm = useCallback(async () => {
    if (isLedgerAccount) {
      await onLedgerConfirm();
      return;
    }

    if (isQrAccount) {
      // MM-native sends (simpleSend / tokenMethodTransfer) defer to the
      // HardwareWalletsSwaps step-progress screen instead of routing
      // through onQrConfirm, which calls executeHardwareWalletOperation
      // and shows an awaiting-confirmation bottom sheet that gets
      // orphaned when deferHwSend navigates away immediately after.
      if (
        isTransactionReq &&
        transactionMetadata &&
        (transactionMetadata.type === TransactionType.simpleSend ||
          transactionMetadata.type === TransactionType.tokenMethodTransfer)
      ) {
        await onTransactionConfirm();
        return;
      }
      await onQrConfirm();
      return;
    }

    if (isSigningQRObject) {
      setSigningConfirmed();
      setScannerVisible(true);
      return;
    }

    if (isTransactionReq) {
      setSigningConfirmed();
      await onTransactionConfirm();
      return;
    }

    setSigningConfirmed();
    await executeApproval();
  }, [
    isLedgerAccount,
    isQrAccount,
    isSigningQRObject,
    isTransactionReq,
    setScannerVisible,
    setSigningConfirmed,
    onTransactionConfirm,
    executeApproval,
    onLedgerConfirm,
    onQrConfirm,
    transactionMetadata,
  ]);

  return { onConfirm, onReject };
};
