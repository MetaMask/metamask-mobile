import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ApprovalType } from '@metamask/controller-utils';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useHardwareWalletSigningContext } from '../context/hardware-wallet-signing-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import Logger from '../../../../util/Logger';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const { cancelRequest, isSigning, isSigningInProgress, openSignModal } =
    useHardwareWalletSigningContext();
  const navigation = useNavigation();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const onReject = useCallback(
    async (error?: Error, skipNavigation = false, navigateToHome = false) => {
      await cancelRequest();
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
      cancelRequest,
      captureSignatureMetrics,
      navigation,
      onRequestReject,
      isSignatureReq,
    ],
  );

  const onConfirm = useCallback(async () => {
    Logger.log('[useConfirmActions] onConfirm called', {
      isSigningInProgress,
      isSigning,
      isTransactionReq,
      isSignatureReq,
      approvalType,
    });

    if (isSigningInProgress || isSigning) {
      Logger.log('[useConfirmActions] Opening sign modal');
      openSignModal();
      return;
    }

    if (isTransactionReq) {
      Logger.log('[useConfirmActions] Calling onTransactionConfirm');
      await onTransactionConfirm();
      return;
    }

    const waitForResult = approvalType !== ApprovalType.TransactionBatch;

    Logger.log('[useConfirmActions] Calling onRequestConfirm for signature');
    await onRequestConfirm({
      waitForResult,
      deleteAfterResult: true,
      handleErrors: false,
    });
    Logger.log('[useConfirmActions] onRequestConfirm completed');

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
    approvalType,
    isSigningInProgress,
    isSigning,
    isTransactionReq,
    onRequestConfirm,
    navigation,
    isSignatureReq,
    openSignModal,
    onTransactionConfirm,
    captureSignatureMetrics,
  ]);

  return { onConfirm, onReject };
};
