import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ApprovalType } from '@metamask/controller-utils';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useLedgerContext } from '../context/ledger-context';
import { useQRHardwareContext } from '../context/qr-hardware-context';
import useApprovalRequest from './useApprovalRequest';
import { useSignatureMetrics } from './signatures/useSignatureMetrics';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useSelectedGasFeeToken } from './gas/useGasFeeToken';
import { updateTransaction } from '../../../../util/transaction-controller';
import { cloneDeep } from 'lodash';
import { RootState } from '../../../../reducers';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { onConfirm: onTransactionConfirm } = useTransactionConfirm();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const {
    cancelQRScanRequestIfPresent,
    isQRSigningInProgress,
    setScannerVisible,
  } = useQRHardwareContext();
  const { ledgerSigningInProgress, openLedgerSignModal } = useLedgerContext();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { chainId } = transactionMetadata ?? {};
  const approvalType = approvalRequest?.type;
  const isSignatureReq = approvalType && isSignatureRequest(approvalType);
  const isTransactionReq =
    approvalType && approvalType === ApprovalType.Transaction;

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const handleSmartTransaction = useCallback(() => {
    if (!selectedGasFeeToken || !transactionMetadata?.txParams) {
      return;
    }

    const updatedTransactionMeta = cloneDeep(transactionMetadata);

    updatedTransactionMeta.batchTransactions = [
      selectedGasFeeToken.transferTransaction,
    ];
    updatedTransactionMeta.txParams.gas = selectedGasFeeToken.gas;
    updatedTransactionMeta.txParams.maxFeePerGas =
      selectedGasFeeToken.maxFeePerGas;
    updatedTransactionMeta.txParams.maxPriorityFeePerGas =
      selectedGasFeeToken.maxPriorityFeePerGas;

    updateTransaction(
      updatedTransactionMeta,
      'Mobile:UseConfirmActions - batchTransactions and gas properties updated',
    );
  }, [selectedGasFeeToken, transactionMetadata]);

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
    if (shouldUseSmartTransaction) {
      handleSmartTransaction();
    }

    if (ledgerSigningInProgress) {
      openLedgerSignModal();
      return;
    }

    if (isQRSigningInProgress) {
      setScannerVisible(true);
      return;
    }

    if (isTransactionReq) {
      onTransactionConfirm();
      return;
    }

    await onRequestConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });

    navigation.goBack();

    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    captureSignatureMetrics,
    handleSmartTransaction,
    isQRSigningInProgress,
    isSignatureReq,
    isTransactionReq,
    ledgerSigningInProgress,
    navigation,
    onRequestConfirm,
    onTransactionConfirm,
    openLedgerSignModal,
    setScannerVisible,
    shouldUseSmartTransaction,
  ]);

  return { onConfirm, onReject };
};
