import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ApprovalType } from '@metamask/controller-utils';

import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import Routes from '../../../../constants/navigation/Routes';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { RootState } from '../../../../reducers';
import { resetTransaction } from '../../../../actions/transaction';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useLedgerContext } from '../context/ledger-context';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from './ui/useFullScreenConfirmation';
import { selectTransactionBridgeQuotesById } from '../../../../core/redux/slices/confirmationMetrics';
import { TransactionType } from '@metamask/transaction-controller';

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

  const {
    chainId,
    id: transactionId,
    type,
  } = useTransactionMetadataRequest() ?? {};

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const dispatch = useDispatch();
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId ?? ''),
  );

  const waitForResult =
    isSignatureReq || (!shouldUseSmartTransaction && !quotes?.length);

  const onReject = useCallback(
    async (error?: Error, skipNavigation = false) => {
      await cancelQRScanRequestIfPresent();
      onRequestReject(error);
      if (!skipNavigation) {
        navigation.goBack();
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
    if (isQRSigningInProgress) {
      setScannerVisible(true);
      return;
    }
    await onRequestConfirm({
      waitForResult,
      deleteAfterResult: true,
      handleErrors: false,
    });

    if (isFullScreenConfirmation && type === TransactionType.perpsDeposit) {
      navigation.navigate(Routes.WALLET_VIEW);
    } else if (isFullScreenConfirmation) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } else {
      navigation.goBack();
    }

    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }

    if (isTransactionReq) {
      // Replace/remove this once we have redesigned send flow
      dispatch(resetTransaction());
    }
  }, [
    captureSignatureMetrics,
    dispatch,
    isFullScreenConfirmation,
    isQRSigningInProgress,
    isSignatureReq,
    isTransactionReq,
    ledgerSigningInProgress,
    navigation,
    onRequestConfirm,
    openLedgerSignModal,
    setScannerVisible,
    waitForResult,
    type,
  ]);

  return { onConfirm, onReject };
};
