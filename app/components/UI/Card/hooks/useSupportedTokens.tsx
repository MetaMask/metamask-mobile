import { useMemo } from 'react';
import { useCardSDK } from '../sdk';
import { SupportedToken } from '../../../../selectors/featureFlagController/card';
import { getDecimalChainId } from '../../../../util/networks';
import { toHex } from '@metamask/controller-utils';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

const getChainNameFromChainId = (chainId: string): string => {
  const decimalChainId = parseInt(chainId, 10);

  if (decimalChainId === 59144 || decimalChainId === 59140) {
    return 'Linea';
  }
  if (decimalChainId === 1 || decimalChainId === 11155111) {
    return 'Ethereum';
  }
  if (decimalChainId === 101 || decimalChainId === 103) {
    return 'Solana';
  }

  return 'Linea';
};

export interface SupportedTokenWithChain extends SupportedToken {
  chainId: string;
  chainName: string;
}

export const useSupportedTokens = (): {
  supportedTokens: SupportedTokenWithChain[];
  isLoading: boolean;
} => {
  const { sdk, isLoading: sdkLoading } = useCardSDK();

  const supportedTokens = useMemo(() => {
    if (!sdk) {
      return [];
    }

    const tokens = sdk.getSupportedTokensByChainId(sdk.lineaChainId);

    const chainId = getDecimalChainId(LINEA_CHAIN_ID);

    const tokensWithChain = tokens.map((token) => ({
      ...token,
      chainId: toHex(chainId.toString()),
      chainName: getChainNameFromChainId(chainId.toString()),
    }));

    return tokensWithChain;
  }, [sdk]);

  return {
    supportedTokens,
    isLoading: sdkLoading,
  };
};
