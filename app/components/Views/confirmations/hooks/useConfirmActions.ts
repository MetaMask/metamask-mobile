import { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './useSignatureMetrics';
import { isExternalHardwareAccount } from '../../../../util/address';
import createExternalSignModelNav from '../../../../util/hardwareWallet/signatureUtils';
import { useNavigation } from '@react-navigation/native';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const navigation = useNavigation();

  const signatureRequest =
    approvalRequest?.type && isSignatureRequest(approvalRequest?.type);

  const onConfirm = useCallback(async () => {
    if (isExternalHardwareAccount(approvalRequest?.requestData?.from)) {
      navigation.navigate(
        ...(await createExternalSignModelNav(
          onRequestReject,
          onRequestConfirm,
          approvalRequest?.requestData,
          'personal_sign',
        )),
      );
    } else {
      await onRequestConfirm({
        waitForResult: true,
        deleteAfterResult: true,
        handleErrors: false,
      });
    }
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
    }
  }, [
    captureSignatureMetrics,
    onRequestConfirm,
    navigation,
    signatureRequest,
    approvalRequest,
    onRequestReject,
  ]);

  const onReject = useCallback(() => {
    onRequestReject();
    if (signatureRequest) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
    }
  }, [captureSignatureMetrics, onRequestReject, signatureRequest]);

  return { onConfirm, onReject };
};
