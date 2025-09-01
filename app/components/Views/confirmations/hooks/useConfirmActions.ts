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
import { useSelectedGasFeeToken } from './gas/useGasFeeToken';
import { cloneDeep } from 'lodash';
import { updateTransaction } from '../../../../util/transaction-controller';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';

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
  const { chainId, id: transactionId, type } = transactionMetadata ?? {};

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { tryEnableEvmNetwork } = useNetworkEnablement();
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
      // Enable the network if it's not enabled for the Network Manager
      if (isRemoveGlobalNetworkSelectorEnabled()) {
        tryEnableEvmNetwork(chainId);
      }
    }
  }, [
    shouldUseSmartTransaction,
    ledgerSigningInProgress,
    isQRSigningInProgress,
    onRequestConfirm,
    waitForResult,
    isFullScreenConfirmation,
    type,
    isSignatureReq,
    isTransactionReq,
    handleSmartTransaction,
    openLedgerSignModal,
    setScannerVisible,
    navigation,
    captureSignatureMetrics,
    dispatch,
    chainId,
    tryEnableEvmNetwork,
  ]);

  return { onConfirm, onReject };
};
