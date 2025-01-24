import { useCallback } from 'react';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './useSignatureMetrics';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();

  const signatureRequest =
    approvalRequest?.type && isSignatureRequest(approvalRequest?.type);

  const onConfirm = useCallback(async () => {
    await onRequestConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [captureSignatureMetrics, onRequestConfirm, signatureRequest]);

  const onReject = useCallback(() => {
    onRequestReject();
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [captureSignatureMetrics, onRequestReject, signatureRequest]);

  return { onConfirm, onReject };
};
