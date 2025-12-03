import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ApprovalType } from '@metamask/controller-utils';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useLedgerContext } from '../context/ledger-context';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';

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
  const { ledgerSigningInProgress, openLedgerSignModal } = useLedgerContext();
  const navigation = useNavigation();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

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
      if (isSignatureReq) {
        captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
        PPOMUtil.clearSignatureSecurityAlertResponse();
      }
    },
    [
      cancelQRScanRequestIfPresent,
      captureSignatureMetrics,
      navigation,
      onRequestReject,
      isSignatureReq,
    ],
  );

  const onConfirm = useCallback(async () => {
    if (ledgerSigningInProgress) {
      openLedgerSignModal();
      return;
    }

    if (isSigningQRObject) {
      setScannerVisible(true);
      return;
    }

    if (isTransactionReq) {
      onTransactionConfirm();
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

    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    ledgerSigningInProgress,
    isSigningQRObject,
    isTransactionReq,
    onRequestConfirm,
    navigation,
    isSignatureReq,
    openLedgerSignModal,
    setScannerVisible,
    onTransactionConfirm,
    captureSignatureMetrics,
    approvalType,
  ]);

  return { onConfirm, onReject };
};
