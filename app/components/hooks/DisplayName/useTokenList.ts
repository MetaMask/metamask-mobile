import { useMemo } from 'react';
import contractMap from '@metamask/contract-metadata';
import { TokenListToken } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectTokenListArray } from '../../../selectors/tokenListController';
import { isMainnetByChainId } from '../../../util/networks';
import { useChainId } from '../../../selectors/hooks';
const NORMALIZED_MAINNET_TOKEN_ARRAY = Object.values(
  contractMap,
) as TokenListToken[];

export default function useTokenList(): TokenListToken[] {
  const chainId = useChainId();
  const isMainnet = isMainnetByChainId(chainId);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const tokenListArray = useSelector(selectTokenListArray);
  const shouldUseStaticList = !isTokenDetectionEnabled && isMainnet;

  return useMemo(() => {
    if (shouldUseStaticList) {
      return NORMALIZED_MAINNET_TOKEN_ARRAY;
    }
    return tokenListArray;
  }, [shouldUseStaticList, tokenListArray]);
}
