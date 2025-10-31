import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
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
import { type TxData } from '@metamask/bridge-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';

const log = createProjectLogger('transaction-confirm');

export const GO_BACK_TYPES = [
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

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

  // const shouldUseSmartTransaction = useSelector((state: RootState) =>
  //   selectShouldUseSmartTransaction(state, chainId),
  // );

  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId ?? ''),
  );

  const waitForResult =
    !isSmartTransaction && !quotes?.length && !selectedGasFeeToken;

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

      // If the gasless flow is not supported (e.g. stx is disabled by the user,
      // or 7702 is not supported in the chain), we override the
      // `isGasFeeSponsored` flag to `false` so the transaction meta object in
      // state has the correct value for the transaction details on the activity
      // list to not show as sponsored. One limitation on the activity list will
      // be that pre-populated transactions on fresh installs will not show as
      // sponsored even if they were because this is not easily observable onchain
      // for all cases.
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;
    },
    [
      selectedGasFeeToken,
      isGaslessSupported,
      transactionMetadata?.isGasFeeSponsored,
    ],
  );

  const { value: chainSupportsSendBundle } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId) : false),
    [chainId],
  );

  const handleGasless7702 = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken) {
        return;
      }

      updatedMetadata.isExternalSign = true;
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;
    },
    [
      isGaslessSupported,
      selectedGasFeeToken,
      transactionMetadata?.isGasFeeSponsored,
    ],
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

    if (isSmartTransaction && chainSupportsSendBundle) {
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
        screen: Routes.PERPS.PERPS_HOME,
      });
    } else if (
      isFullScreenConfirmation &&
      !hasTransactionType(transactionMetadata, GO_BACK_TYPES)
    ) {
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
    chainSupportsSendBundle,
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
    isSmartTransaction,
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
      ...getQuoteBatchTransaction(quote.trade as TxData),
      type: TransactionType.swap,
    });

    return result;
  });
}

function getQuoteBatchTransaction(transaction: TxData): BatchTransaction {
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
