import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
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
import { useMusdConfirmNavigation } from '../../../../UI/Earn/hooks/useMusdConfirmNavigation';

const log = createProjectLogger('transaction-confirm');

export const GO_BACK_TYPES = [
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function useTransactionConfirm() {
  const { onConfirm: onRequestConfirm } = useApprovalRequest();
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { chainId, isGasFeeTokenIgnoredIfBalance, type } =
    transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const quotes = useTransactionPayQuotes();
  const { navigateOnConfirm: musdConversionNavigateOnConfirm } =
    useMusdConfirmNavigation();

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
    },
    [selectedGasFeeToken, isGasFeeTokenIgnoredIfBalance],
  );

  const handleGasless7702 = useCallback(
    (updatedMetadata: TransactionMeta) => {
      if (!selectedGasFeeToken || isGasFeeTokenIgnoredIfBalance) {
        return;
      }

      updatedMetadata.isExternalSign = true;
    },
    [isGasFeeTokenIgnoredIfBalance, selectedGasFeeToken],
  );

  const onConfirm = useCallback(
    async (options?: { onError?: (error: unknown) => void }) => {
      if (!transactionMetadata) {
        return;
      }

      const updatedMetadata = cloneDeep(transactionMetadata);

      // Ensure the persisted `isGasFeeSponsored` flag reflects whether gasless
      // is actually supported (e.g. HW wallets don't support gasless, so the
      // flag must be cleared so the activity list does not show "Paid by MetaMask").
      updatedMetadata.isGasFeeSponsored =
        isGaslessSupported && transactionMetadata?.isGasFeeSponsored;

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
        options?.onError?.(error);
      }

      // Perps deposit-and-order: caller handles navigation (e.g. order flow)
      if (type === TransactionType.perpsDepositAndOrder) {
        return;
      } else if (type === TransactionType.perpsDeposit) {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
        });
      } else if (type === TransactionType.musdConversion) {
        musdConversionNavigateOnConfirm();
      } else if (
        isFullScreenConfirmation &&
        !hasTransactionType(transactionMetadata, GO_BACK_TYPES)
      ) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      } else {
        navigation.goBack();
      }

      tryEnableEvmNetwork(chainId);
    },
    [
      chainId,
      handleGasless7702,
      handleSmartTransaction,
      isFullScreenConfirmation,
      isGaslessSupported,
      isGaslessSupportedSTX,
      navigation,
      musdConversionNavigateOnConfirm,
      onRequestConfirm,
      selectedGasFeeToken,
      transactionMetadata,
      tryEnableEvmNetwork,
      type,
      waitForResult,
    ],
  );

  return { onConfirm };
}
