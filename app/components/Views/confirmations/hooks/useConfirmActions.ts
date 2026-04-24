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
import { useIsConfirmationFromLedgerAccount } from './useIsConfirmationFromLedgerAccount';
import { useIsConfirmationFromQrAccount } from '../../../../core/HardwareWallet/hooks/useIsConfirmationFromQrAccount';
import { useLedgerConfirm } from './useLedgerConfirm';
import { useQrConfirm } from '../../../../core/HardwareWallet/hooks/useQrConfirm';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const { cancelQRScanRequestIfPresent } = useQRHardwareContext();
  const navigation = useNavigation();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const isLedgerAccount = useIsConfirmationFromLedgerAccount();
  const isQrAccount = useIsConfirmationFromQrAccount();

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

  const hardwareConfirmOptions = useMemo(
    () => ({
      onReject,
      onTransactionConfirm,
      executeApproval,
      isTransactionReq: Boolean(isTransactionReq),
    }),
    [onReject, onTransactionConfirm, executeApproval, isTransactionReq],
  );

  const { onConfirm: onLedgerConfirm } = useLedgerConfirm(
    hardwareConfirmOptions,
  );
  const { onConfirm: onQrConfirm } = useQrConfirm(hardwareConfirmOptions);

  const onConfirm = useCallback(async () => {
    if (isLedgerAccount) {
      await onLedgerConfirm();
      return;
    }

    if (isQrAccount) {
      await onQrConfirm();
      return;
    }

    if (isTransactionReq) {
      await onTransactionConfirm();
      return;
    }

    await executeApproval();
  }, [
    isLedgerAccount,
    isQrAccount,
    isTransactionReq,
    onTransactionConfirm,
    executeApproval,
    onLedgerConfirm,
    onQrConfirm,
  ]);

  return { onConfirm, onReject };
};
