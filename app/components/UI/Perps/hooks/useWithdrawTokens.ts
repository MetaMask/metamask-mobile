import { toHex } from '@metamask/controller-utils';
import { type Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { selectTokenList } from '../../../../selectors/tokenListController';
import type { PerpsToken } from '../types';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
  ZERO_ADDRESS,
} from '../constants/hyperLiquidConfig';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';

/**
 * TODO: make the hook dynamic once we manage multiple perps provider.
 * Currently speicifc to hyperliquid.
 *
 * Hook to manage source and destination tokens for withdrawal
 * @returns Source and destination token configurations
 */
export const useWithdrawTokens = () => {
  // Selectors
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Source token (Hyperliquid USDC)
  const sourceToken = useMemo<PerpsToken>(() => {
    // Always use mainnet chain ID for network image (like in deposit/order views)
    const hyperliquidChainId = HYPERLIQUID_MAINNET_CHAIN_ID;
    const baseToken: PerpsToken = {
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: hyperliquidChainId,
      currencyExchangeRate: 1,
    };

    // Enhance with icon from token list
    if (tokenList) {
      return enhanceTokenWithIcon({
        token: baseToken,
        tokenList,
        isIpfsGatewayEnabled,
      });
    }

    return baseToken;
  }, [tokenList, isIpfsGatewayEnabled]);

  // Destination token (Arbitrum USDC)
  const destToken = useMemo<PerpsToken>(() => {
    const arbitrumChainId = toHex(
      parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10),
    ) as Hex;

    const baseToken: PerpsToken = {
      symbol: USDC_SYMBOL,
      address: USDC_ARBITRUM_MAINNET_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: arbitrumChainId,
      currencyExchangeRate: 1,
    };

    // Enhance with icon from token list
    if (tokenList) {
      return enhanceTokenWithIcon({
        token: baseToken,
        tokenList,
        isIpfsGatewayEnabled,
      });
    }

    return baseToken;
  }, [tokenList, isIpfsGatewayEnabled]);

  return {
    sourceToken,
    destToken,
  };
};
