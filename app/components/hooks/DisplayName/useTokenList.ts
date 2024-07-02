import { useMemo } from 'react';
import contractMap from '@metamask/contract-metadata';
import { TokenListToken } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectTokenListArray } from '../../../selectors/tokenListController';
import { isMainnetByChainId } from '../../../util/networks';

const NORMALIZED_MAINNET_TOKEN_ARRAY = Object.values(contractMap);

export default function useTokenList(): TokenListToken[] {
  const chainId = useSelector(selectChainId);
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
