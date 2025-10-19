import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { resetTransaction } from '../../../../../actions/transaction';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import {
  BatchTransaction,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { cloneDeep } from 'lodash';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../util/networks';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { TransactionBridgeQuote } from '../../utils/bridge';
import { Hex, createProjectLogger } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useSelectedGasFeeToken } from '../gas/useGasFeeToken';

const log = createProjectLogger('transaction-confirm');

export function useTransactionConfirm() {
  const { onConfirm: onRequestConfirm } = useApprovalRequest();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { chainId, id: transactionId, type } = transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  const {
    totalBridgeFeeFormatted: bridgeFeeFiat,
    totalFormatted: totalFiat,
    totalNativeEstimatedFormatted: networkFeeFiat,
  } = useTransactionTotalFiat();

  const { tryEnableEvmNetwork } = useNetworkEnablement();

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId ?? ''),
  );

  const waitForResult =
    !shouldUseSmartTransaction && !quotes?.length && !selectedGasFeeToken;

  const hasSameChainQuote =
    quotes?.length &&
    quotes[0].quote.srcChainId === quotes[0].quote.destChainId;

  const batchTransactions = useMemo(
    () => (hasSameChainQuote ? getQuoteBatchTransactions(quotes) : undefined),
    [hasSameChainQuote, quotes],
  );

  const handleSmartTransaction = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken) {
        return;
      }

      updatedMetadata.batchTransactions = [
        ...(updatedMetadata.batchTransactions ?? []),
        selectedGasFeeToken.transferTransaction,
      ];
      updatedMetadata.txParams.gas = selectedGasFeeToken.gas;
      updatedMetadata.txParams.maxFeePerGas = selectedGasFeeToken.maxFeePerGas;
      updatedMetadata.txParams.maxPriorityFeePerGas =
        selectedGasFeeToken.maxPriorityFeePerGas;
    },
    [selectedGasFeeToken],
  );

  const handleGasless7702 = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken) {
        return;
      }

      updatedMetadata.isExternalSign = true;
    },
    [selectedGasFeeToken],
  );

  const onConfirm = useCallback(async () => {
    if (!transactionMetadata) {
      return;
    }

    const updatedMetadata = cloneDeep(transactionMetadata);
    updatedMetadata.metamaskPay = {};
    updatedMetadata.metamaskPay.bridgeFeeFiat = bridgeFeeFiat;
    updatedMetadata.metamaskPay.chainId = payToken?.chainId;
    updatedMetadata.metamaskPay.networkFeeFiat = networkFeeFiat;
    updatedMetadata.metamaskPay.tokenAddress = payToken?.address;
    updatedMetadata.metamaskPay.totalFiat = totalFiat;

    if (batchTransactions) {
      updatedMetadata.batchTransactions = batchTransactions;
      updatedMetadata.batchTransactionsOptions = {};
    }

    if (shouldUseSmartTransaction) {
      handleSmartTransaction(updatedMetadata);
    } else if (selectedGasFeeToken) {
      handleGasless7702(updatedMetadata);
    }

    try {
      await onRequestConfirm(
        {
          deleteAfterResult: true,
          // Intentionally not hiding errors so we can log
          handleErrors: false,
          waitForResult,
        },
        { txMeta: updatedMetadata },
      );
    } catch (error) {
      log('Error confirming transaction', error);
    }

    if (type === TransactionType.perpsDeposit) {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    } else if (isFullScreenConfirmation) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } else {
      navigation.goBack();
    }

    // Replace/remove this once we have redesigned send flow
    dispatch(resetTransaction());

    // Enable the network if it's not enabled for the Network Manager
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      tryEnableEvmNetwork(chainId);
    }
  }, [
    batchTransactions,
    bridgeFeeFiat,
    chainId,
    dispatch,
    handleGasless7702,
    handleSmartTransaction,
    isFullScreenConfirmation,
    navigation,
    networkFeeFiat,
    onRequestConfirm,
    payToken?.address,
    payToken?.chainId,
    selectedGasFeeToken,
    shouldUseSmartTransaction,
    totalFiat,
    transactionMetadata,
    tryEnableEvmNetwork,
    type,
    waitForResult,
  ]);

  return { onConfirm };
}

function getQuoteBatchTransactions(
  quotes: TransactionBridgeQuote[],
): BatchTransaction[] {
  return quotes.flatMap((quote) => {
    const result = [];

    if (quote.approval) {
      result.push({
        ...getQuoteBatchTransaction(quote.approval),
        type: TransactionType.swapApproval,
      });
    }

    result.push({
      ...getQuoteBatchTransaction(quote.trade),
      type: TransactionType.swap,
    });

    return result;
  });
}

function getQuoteBatchTransaction(
  transaction: TransactionBridgeQuote['trade'],
): BatchTransaction {
  const data = transaction.data as Hex;
  const gas = transaction.gasLimit ? toHex(transaction.gasLimit) : undefined;
  const to = transaction.to as Hex;
  const value = transaction.value as Hex;

  return {
    data,
    gas,
    isAfter: false,
    to,
    value,
  };
}
