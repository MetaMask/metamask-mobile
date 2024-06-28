import { useMemo } from 'react';
import { type TokenListMap } from '@metamask/assets-controllers';
import contractMap from '@metamask/contract-metadata';

import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectTokenList } from '../../../selectors/tokenListController';
import { isMainnetByChainId } from '../../../util/networks';

function normalizeTokenAddresses(tokenMap: TokenListMap) {
  return Object.keys(tokenMap).reduce((acc, address) => {
    const tokenMetadata = tokenMap[address];
    return {
      ...acc,
      [address.toLowerCase()]: {
        ...tokenMetadata,
      },
    };
  }, {});
}

const NORMALIZED_MAINNET_TOKEN_LIST = normalizeTokenAddresses(contractMap);

export default function useTokenList(): TokenListMap {
  const chainId = useSelector(selectChainId);
  const isMainnet = isMainnetByChainId(chainId);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const tokenList = useSelector(selectTokenList);
  const shouldUseStaticList = !isTokenDetectionEnabled && isMainnet;

  return useMemo(() => {
    if (shouldUseStaticList) {
      return NORMALIZED_MAINNET_TOKEN_LIST;
    }
    return normalizeTokenAddresses(tokenList);
  }, [shouldUseStaticList, tokenList]);
}
