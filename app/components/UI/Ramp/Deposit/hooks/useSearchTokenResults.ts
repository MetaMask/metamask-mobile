import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import { CaipChainId } from '@metamask/utils';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../constants/networks';

function useSearchTokenResults({
  tokens,
  networkFilter,
  searchString,
}: {
  tokens: DepositCryptoCurrency[];
  networkFilter?: CaipChainId[] | null;
  searchString: string;
}) {
  const networkFilteredTokens = useMemo(() => {
    if (!networkFilter || networkFilter.length === 0) {
      return tokens;
    }
    return tokens.filter((token) => networkFilter.includes(token.chainId));
  }, [tokens, networkFilter]);

  type TokenWithNetworkName = DepositCryptoCurrency & { networkName: string };

  const tokensWithNetworkName = useMemo(
    () =>
      networkFilteredTokens.map((token) => ({
        ...token,
        networkName: token.chainId
          ? DEPOSIT_NETWORKS_BY_CHAIN_ID[token.chainId]?.name
          : '',
      })),
    [networkFilteredTokens],
  );

  const tokenFuse = useMemo(
    () =>
      new Fuse<TokenWithNetworkName>(tokensWithNetworkName, {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        minMatchCharLength: 1,
        keys: ['symbol', 'assetId', 'name', 'chainId', 'networkName'],
      }),
    [tokensWithNetworkName],
  );

  return useMemo((): TokenWithNetworkName[] => {
    if (!searchString || tokensWithNetworkName.length === 0) {
      return tokensWithNetworkName;
    }

    return tokenFuse.search(searchString);
  }, [searchString, tokensWithNetworkName, tokenFuse]);
}

export default useSearchTokenResults;
