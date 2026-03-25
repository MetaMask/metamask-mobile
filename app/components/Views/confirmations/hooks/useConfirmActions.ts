import { useCallback, useMemo } from 'react';
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
import { useIsConfirmationFromHardwareWalletAccount } from './useIsConfirmationFromLedgerAccount';
import { useHardwareWalletConfirm } from './useLedgerConfirm';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const transactionMetadata = useTransactionMetadataRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const { cancelQRScanRequestIfPresent, isSigningQRObject, setScannerVisible } =
    useQRHardwareContext();
  const navigation = useNavigation();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const fromAddress =
    (approvalRequest?.requestData?.from as string) ||
    (transactionMetadata?.txParams?.from as string) ||
    '';

  const isHardwareWalletAccount =
    useIsConfirmationFromHardwareWalletAccount();

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

  const ledgerConfirmOptions = useMemo(
    () => ({
      fromAddress,
      onReject,
      onTransactionConfirm,
      executeApproval,
      isTransactionReq: Boolean(isTransactionReq),
    }),
    [fromAddress, onReject, onTransactionConfirm, executeApproval, isTransactionReq],
  );

  const { onConfirm: onHardwareWalletConfirm } =
    useHardwareWalletConfirm(ledgerConfirmOptions);

  const onConfirm = useCallback(async () => {
    if (isSigningQRObject) {
      setScannerVisible(true);
      return;
    }

    if (isHardwareWalletAccount) {
      await onHardwareWalletConfirm();
      return;
    }

    if (isTransactionReq) {
      await onTransactionConfirm();
      return;
    }

    await executeApproval();
  }, [
    isSigningQRObject,
    isHardwareWalletAccount,
    isTransactionReq,
    setScannerVisible,
    onTransactionConfirm,
    executeApproval,
    onHardwareWalletConfirm,
  ]);

  return { onConfirm, onReject };
};
