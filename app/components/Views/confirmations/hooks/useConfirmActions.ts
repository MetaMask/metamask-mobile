import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Routes from '../../../../constants/navigation/Routes';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { RootState } from '../../../../reducers';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useLedgerContext } from '../context/ledger-context';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useStandaloneConfirmation } from './ui/useStandaloneConfirmation';

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
    (state: RootState) => selectShouldUseSmartTransaction(state, transactionMetadata?.chainId)
  );
  const { isStandaloneConfirmation } = useStandaloneConfirmation();

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

    if (isStandaloneConfirmation) {
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
    isStandaloneConfirmation,
    shouldUseSmartTransaction,
  ]);

  return { onConfirm, onReject };
};
