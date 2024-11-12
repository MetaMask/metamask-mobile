import { useSelector } from 'react-redux';
import { RootState } from '../reducers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectAccountsByChainId } from './accountTrackerController';

interface AccountInfo {
  balance: string;
}

interface ChainAccounts {
  [address: string]: AccountInfo;
}

interface AccountsByChainId {
  [chainId: string]: ChainAccounts;
}

export function getSelectedAccountNativeTokenCachedBalanceByChainId(
  state: RootState,
) {
  const selectedAddress = selectSelectedInternalAccountAddress(state);
  const accountsByChainId = selectAccountsByChainId(state);

  const balancesByChainId: { [chainId: string]: string } = {};

  if (!selectedAddress) {
    return balancesByChainId;
  }

  for (const [chainId, accounts] of Object.entries(
    accountsByChainId || ({} as AccountsByChainId),
  )) {
    if (accounts[selectedAddress]) {
      balancesByChainId[chainId] = accounts[selectedAddress].balance;
    }
  }

  return balancesByChainId;
}

export function getSelectedAccountTokensAcrossChains(state: RootState) {
  const selectedAddress = selectSelectedInternalAccountAddress(state);
  const allTokens = selectAllTokens(state);
  const nativeTokenBalancesByChainId =
    getSelectedAccountNativeTokenCachedBalanceByChainId(state);
  console.log('nativeTokenBalancesByChainId:', nativeTokenBalancesByChainId);
}
