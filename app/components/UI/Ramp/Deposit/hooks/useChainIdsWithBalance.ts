import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { hexToBN } from '@metamask/controller-utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  selectMultichainBalances,
  selectedAccountNativeTokenCachedBalanceByChainId,
} from '../../../../../selectors/multichain';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { SOLANA_MAINNET } from '../constants/networks';

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
      const amount =
        selectedMultichainBalances[selectedSelectedInternalAccount.id][
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501'
        ]?.amount;
      if (parseFloat(amount) > 0) {
        chainIdsWithBalance.push(SOLANA_MAINNET.chainId);
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
