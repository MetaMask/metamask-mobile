import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import { Hex } from '@metamask/utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { generateTransferData } from '../../../../util/transactions';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { ARBITRUM_USDC } from '../../../Views/confirmations/constants/perps';
import { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { ensureError } from '../../../../util/errorUtils';
import { isUserRejectedError } from '../utils/isUserRejectedError';
import usePerpsToasts from './usePerpsToasts';

/**
 * Hook that triggers the Perps "withdraw to any token" confirmation flow.
 *
 * Creates a dummy ERC-20 transfer on Arbitrum typed as `perpsWithdraw`,
 * which the confirmation UI + PayController detect to drive the
 * CustomAmount / MetaMask Pay experience.
 */
export function usePerpsWithdrawConfirmation() {
  // Perps withdraws settle on Arbitrum, so the batch must originate from the
  // selected group's EVM account (the globally selected account can be non-EVM).
  const selectedEvmAccountAddress = useSelector(
    selectSelectedInternalAccountByScope,
  )('eip155:0')?.address;
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation<AppNavigationProp>();
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
          from: selectedEvmAccountAddress as Hex,
          origin: ORIGIN_METAMASK,
          isInternal: true,
          networkClientId,
          disableHook: true,
          disableSequential: true,
          overwriteUpgrade: true,
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
            () => runWithdrawWithConfirmation().catch(() => undefined),
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
      selectedEvmAccountAddress,
      showToast,
      transferData,
    ],
  );

  return { withdrawWithConfirmation };
}
