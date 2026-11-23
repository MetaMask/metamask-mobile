import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';

/**
 * Provides the confirmation `onReject` handler in isolation.
 *
 * Extracted from `useConfirmActions` so that consumers which only need to
 * reject a confirmation (alerts, navbar, back-swipe handler) don't drag in the
 * entire confirm path — `useTransactionConfirm`, `useTransactionMetadataRequest`,
 * `useLedgerConfirm`, `useQrConfirm`, ledger/QR account detection — none of
 * which `onReject` depends on. Those hooks are expensive and re-run on the
 * confirmation critical path; keeping them out of the reject-only consumers is
 * a meaningful perf win (`useTransactionAlerts` instantiated the full tree
 * twice just to grab this one callback).
 *
 * `useConfirmActions` re-exports the `onReject` returned here, so this remains
 * the single source of truth for reject behaviour.
 */
export const useConfirmReject = () => {
  const { onReject: onRequestReject, approvalRequest } = useApprovalRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const { cancelQRScanRequestIfPresent } = useQRHardwareContext();
  const navigation = useNavigation<AppNavigationProp>();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);

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

  return { onReject };
};
