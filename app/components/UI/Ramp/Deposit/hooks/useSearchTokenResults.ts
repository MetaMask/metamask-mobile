import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk/dist/Deposit';
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
      new Fuse(tokensWithNetworkName, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'assetId', 'name', 'chainId', 'networkName'],
      }),
    [tokensWithNetworkName],
  );

  if (!searchString || tokensWithNetworkName.length === 0) {
    return tokensWithNetworkName;
  }

  const results = tokenFuse.search(searchString);

  if (results.length === 0) {
    return [];
  }

  return results;
}

export default useSearchTokenResults;
