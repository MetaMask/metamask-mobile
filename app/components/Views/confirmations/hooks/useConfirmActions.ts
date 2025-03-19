import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest, isStakingConfirmation } from '../utils/confirm';
import { useLedgerContext } from '../context/LedgerContext';
import { useQRHardwareContext } from '../context/QRHardwareContext';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './useSignatureMetrics';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

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
      waitForResult: false,
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
  ]);

  return { onConfirm, onReject };
};
