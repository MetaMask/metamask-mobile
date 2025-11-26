import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
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
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useGaslessSupportedSmartTransactions } from '../gas/useGaslessSupportedSmartTransactions';
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
  const { chainId, isGasFeeTokenIgnoredIfBalance, type } =
    transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const quotes = useTransactionPayQuotes();

  const { tryEnableEvmNetwork } = useNetworkEnablement();

  const { isSupported: isGaslessSupportedSTX, isSmartTransaction } =
    useGaslessSupportedSmartTransactions();

  const { isSupported: isGaslessSupported } = useIsGaslessSupported();

  const waitForResult =
    !isSmartTransaction && !quotes?.length && !selectedGasFeeToken;

  const handleSmartTransaction = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken || isGasFeeTokenIgnoredIfBalance) {
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
      isGasFeeTokenIgnoredIfBalance,
      isGaslessSupported,
      transactionMetadata?.isGasFeeSponsored,
    ],
  );

  const handleGasless7702 = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken || isGasFeeTokenIgnoredIfBalance) {
        return;
      }

      updatedMetadata.isExternalSign = true;
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;
    },
    [
      isGasFeeTokenIgnoredIfBalance,
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

    if (isGaslessSupportedSTX) {
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
    tryEnableEvmNetwork(chainId);
  }, [
    chainId,
    dispatch,
    handleGasless7702,
    handleSmartTransaction,
    isFullScreenConfirmation,
    isGaslessSupportedSTX,
    navigation,
    onRequestConfirm,
    selectedGasFeeToken,
    transactionMetadata,
    tryEnableEvmNetwork,
    type,
    waitForResult,
  ]);

  return { onConfirm };
}
