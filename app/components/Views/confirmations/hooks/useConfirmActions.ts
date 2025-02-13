import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/QRHardwareContext/QRHardwareContext';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './useSignatureMetrics';

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
  const navigation = useNavigation();

  const signatureRequest =
    approvalRequest?.type && isSignatureRequest(approvalRequest?.type);

  const onConfirm = useCallback(async () => {
    if (isQRSigningInProgress) {
      setScannerVisible(true);
      return;
    }
    await onRequestConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
    navigation.goBack();
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    captureSignatureMetrics,
    isQRSigningInProgress,
    navigation,
    onRequestConfirm,
    setScannerVisible,
    signatureRequest,
  ]);

  const onReject = useCallback(async () => {
    await cancelQRScanRequestIfPresent();
    onRequestReject();
    navigation.goBack();
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    cancelQRScanRequestIfPresent,
    captureSignatureMetrics,
    navigation,
    onRequestReject,
    signatureRequest,
  ]);

  return { onConfirm, onReject };
};
