import { useCallback } from 'react';

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
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    captureSignatureMetrics,
    isQRSigningInProgress,
    onRequestConfirm,
    setScannerVisible,
    signatureRequest,
  ]);

  const onReject = useCallback(async () => {
    await cancelQRScanRequestIfPresent();
    onRequestReject();
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    cancelQRScanRequestIfPresent,
    captureSignatureMetrics,
    onRequestReject,
    signatureRequest,
  ]);

  return { onConfirm, onReject };
};
