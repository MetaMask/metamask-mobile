import { useSelector } from 'react-redux';
import {
  selectMultichainBalances,
  selectedAccountNativeTokenCachedBalanceByChainId,
} from '../../../../../selectors/multichain';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { hexToBN } from '@metamask/controller-utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { useMemo } from 'react';

function useChainIdsWithBalance() {
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedSelectedInternalAccount = useSelector(
    selectSelectedInternalAccount,
  );
  const selectedMultichainBalances = useSelector(selectMultichainBalances);
  const selectedSelectedAccountNativeTokenCachedBalanceByChainId = useSelector(
    selectedAccountNativeTokenCachedBalanceByChainId,
  );

  const chainIds = useMemo(() => {
    const chainIdsWithBalance: CaipChainId[] = [];
    console.log(selectedSelectedInternalAccount);

    if (isEvmNetworkSelected) {
      // grab the chain id from the selected evm chain id balance is not 0
      // using selectedSelectedAccountNativeTokenCachedBalanceByChainId;
      const evmChainIdsWithBalance = Object.keys(
        selectedSelectedAccountNativeTokenCachedBalanceByChainId,
      )
        .filter(
          (chainId) =>
            !hexToBN(
              selectedSelectedAccountNativeTokenCachedBalanceByChainId[chainId]
                .balance,
            ).isZero(),
        )
        .map((chainId) => toEvmCaipChainId(chainId as Hex));

      chainIdsWithBalance.push(...evmChainIdsWithBalance);
    } else if (
      selectedSelectedInternalAccount?.scopes.includes(SolScope.Mainnet)
    ) {
      const selectedInternalAccountId = selectedSelectedInternalAccount.id;
      const amount =
        selectedMultichainBalances[selectedInternalAccountId][
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501'
        ].amount;
      if (
        parseFloat(amount) > 0 // check if the balance is greater than 0
      ) {
        chainIdsWithBalance.push(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
        );
      }
    }

    return chainIdsWithBalance;
  }, [
    isEvmNetworkSelected,
    selectedMultichainBalances,
    selectedSelectedAccountNativeTokenCachedBalanceByChainId,
    selectedSelectedInternalAccount?.id,
    selectedSelectedInternalAccount?.scopes,
  ]);

  return chainIds;
}

export default useChainIdsWithBalance;
