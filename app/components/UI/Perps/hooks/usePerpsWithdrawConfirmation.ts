import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { generateTransferData } from '../../../../util/transactions';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { ARBITRUM_USDC } from '../../../Views/confirmations/constants/perps';
import { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { ensureError } from '../../../../util/errorUtils';
import { containsUserRejectedError } from '../../../../util/middlewares';
import usePerpsToasts from './usePerpsToasts';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

function getErrorLike(error: unknown): ErrorLike | undefined {
  return typeof error === 'object' && error !== null
    ? (error as ErrorLike)
    : undefined;
}

function getErrorCode(error: unknown): number | undefined {
  const code = getErrorLike(error)?.code;

  if (typeof code === 'number') {
    return code;
  }

  if (typeof code === 'string') {
    const numericCode = Number(code);
    return Number.isNaN(numericCode) ? undefined : numericCode;
  }

  return undefined;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  const message = getErrorLike(error)?.message;
  return typeof message === 'string' ? message : fallbackMessage;
}

function isUserRejectedError(error: unknown, fallbackMessage: string): boolean {
  return containsUserRejectedError(
    getErrorMessage(error, fallbackMessage),
    getErrorCode(error),
  );
}

/**
 * Hook that triggers the Perps "withdraw to any token" confirmation flow.
 *
 * Creates a dummy ERC-20 transfer on Arbitrum typed as `perpsWithdraw`,
 * which the confirmation UI + PayController detect to drive the
 * CustomAmount / MetaMask Pay experience.
 */
export function usePerpsWithdrawConfirmation() {
  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const { networkClientId } =
    useSelector((state: RootState) =>
      selectDefaultEndpointByChainId(state, CHAIN_IDS.ARBITRUM),
    ) ?? {};

  const transferData = generateTransferData('transfer', {
    toAddress: ARBITRUM_USDC.address,
    amount: '0x0',
  }) as Hex;

  const withdrawWithConfirmation = useCallback(
    async function runWithdrawWithConfirmation() {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PERPS.ROOT,
      });

      try {
        await addTransactionBatch({
          from: selectedAccount as Hex,
          origin: ORIGIN_METAMASK,
          networkClientId,
          disableHook: true,
          disableSequential: true,
          transactions: [
            {
              params: {
                to: ARBITRUM_USDC.address,
                data: transferData,
              },
              type: TransactionType.perpsWithdraw,
            },
          ],
        });
      } catch (error) {
        const errorObj = ensureError(
          error,
          'usePerpsWithdrawConfirmation.withdrawWithConfirmation',
        );

        if (isUserRejectedError(error, errorObj.message)) {
          throw errorObj;
        }

        navigation.goBack();
        showToast(
          PerpsToastOptions.accountManagement.withdrawal.withdrawalStartFailed(
            () => {
              runWithdrawWithConfirmation().catch(() => undefined);
            },
          ),
        );
        throw errorObj;
      }
    },
    [
      navigateToConfirmation,
      navigation,
      networkClientId,
      PerpsToastOptions.accountManagement.withdrawal,
      selectedAccount,
      showToast,
      transferData,
    ],
  );

  return { withdrawWithConfirmation };
}
