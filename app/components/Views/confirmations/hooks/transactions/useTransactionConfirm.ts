import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { resetTransaction } from '../../../../../actions/transaction';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { createProjectLogger } from '@metamask/utils';
import { useSelectedGasFeeToken } from '../gas/useGasFeeToken';
import { hasTransactionType } from '../../utils/transaction';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { cloneDeep } from 'lodash';
import { useTransactionPayQuotes } from '../pay/useTransactionPayData';

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
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { chainId, type } = transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const quotes = useTransactionPayQuotes();

  const { tryEnableEvmNetwork } = useNetworkEnablement();

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const waitForResult =
    !shouldUseSmartTransaction && !quotes?.length && !selectedGasFeeToken;

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
    },
    [selectedGasFeeToken],
  );

  const onConfirm = useCallback(async () => {
    if (!transactionMetadata) {
      return;
    }

    const updatedMetadata = cloneDeep(transactionMetadata);

    if (shouldUseSmartTransaction && chainSupportsSendBundle) {
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
    tryEnableEvmNetwork(chainId);
  }, [
    chainSupportsSendBundle,
    chainId,
    dispatch,
    handleGasless7702,
    handleSmartTransaction,
    isFullScreenConfirmation,
    navigation,
    onRequestConfirm,
    selectedGasFeeToken,
    shouldUseSmartTransaction,
    transactionMetadata,
    tryEnableEvmNetwork,
    type,
    waitForResult,
  ]);

  return { onConfirm };
}
