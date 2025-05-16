import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest, isStakingConfirmation } from '../utils/confirm';
import { useLedgerContext } from '../context/ledger-context';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { useSelector } from 'react-redux';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const {
    cancelQRScanRequestIfPresent,
    isQRSigningInProgress,
    setScannerVisible,
  } = useQRHardwareContext();
  const { ledgerSigningInProgress, openLedgerSignModal } = useLedgerContext();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const shouldUseSmartTransaction = useSelector(
    selectShouldUseSmartTransaction,
  );
  const isOneOfTheStakingConfirmations = isStakingConfirmation(
    transactionMetadata?.type as string,
  );

  const isSignatureReq =
    approvalRequest?.type && isSignatureRequest(approvalRequest?.type);

  const onReject = useCallback(async () => {
    await cancelQRScanRequestIfPresent();
    onRequestReject();
    navigation.goBack();
    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    cancelQRScanRequestIfPresent,
    captureSignatureMetrics,
    navigation,
    onRequestReject,
    isSignatureReq,
  ]);

  const onConfirm = useCallback(async () => {
    if (ledgerSigningInProgress) {
      openLedgerSignModal();
      return;
    }
    if (isQRSigningInProgress) {
      setScannerVisible(true);
      return;
    }
    await onRequestConfirm({
      waitForResult: isSignatureReq || !shouldUseSmartTransaction,
      deleteAfterResult: true,
      handleErrors: false,
    });

    if (isOneOfTheStakingConfirmations) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } else {
      navigation.goBack();
    }

    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    isQRSigningInProgress,
    ledgerSigningInProgress,
    navigation,
    openLedgerSignModal,
    setScannerVisible,
    captureSignatureMetrics,
    onRequestConfirm,
    isSignatureReq,
    isOneOfTheStakingConfirmations,
    shouldUseSmartTransaction,
  ]);

  return { onConfirm, onReject };
};
