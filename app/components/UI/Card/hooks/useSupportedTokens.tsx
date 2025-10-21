import { useMemo } from 'react';
import { useCardSDK } from '../sdk';
import { SupportedToken } from '../../../../selectors/featureFlagController/card';
import { getDecimalChainId } from '../../../../util/networks';
import { toHex } from '@metamask/controller-utils';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

export interface SupportedTokenWithChain extends SupportedToken {
  chainId: string;
  chainName: string;
}

export const useSupportedTokens = (): {
  supportedTokens: SupportedTokenWithChain[];
  isLoading: boolean;
} => {
  const { sdk, isLoading } = useCardSDK();

  const supportedTokens = useMemo(() => {
    if (!sdk) {
      return [];
    }

    const tokens = sdk.getSupportedTokensByChainId(sdk.lineaChainId);

    // TODO: get chainId from sdk
    const chainId = getDecimalChainId(LINEA_CHAIN_ID);

    return tokens.map((token) => ({
      ...token,
      chainId: toHex(chainId.toString()),
      chainName: 'Linea', // TODO: get chain name from sdk
    }));
  }, [sdk]);

  return {
    supportedTokens,
    isLoading,
  };
};
