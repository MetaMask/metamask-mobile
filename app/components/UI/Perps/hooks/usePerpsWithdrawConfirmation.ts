import { useCallback } from 'react';
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

  const { networkClientId } =
    useSelector((state: RootState) =>
      selectDefaultEndpointByChainId(state, CHAIN_IDS.ARBITRUM),
    ) ?? {};

  const transferData = generateTransferData('transfer', {
    toAddress: ARBITRUM_USDC.address,
    amount: '0x0',
  }) as Hex;

  const withdrawWithConfirmation = useCallback(async () => {
    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.PERPS.ROOT,
    });

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
  }, [navigateToConfirmation, networkClientId, selectedAccount, transferData]);

  return { withdrawWithConfirmation };
}
