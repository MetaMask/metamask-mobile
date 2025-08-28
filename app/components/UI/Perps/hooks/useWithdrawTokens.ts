import { toHex } from '@metamask/controller-utils';
import { type Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectPerpsNetwork } from '../selectors/perpsController';
import type { PerpsToken } from '../types';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
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
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const isTestnet = perpsNetwork === 'testnet';

  // Source token (USDC from Perps Account - not showing Hyperliquid)
  const sourceToken = useMemo<PerpsToken>(() => {
    // Use appropriate Arbitrum chain ID based on network
    const chainId = isTestnet
      ? ARBITRUM_TESTNET_CHAIN_ID
      : ARBITRUM_MAINNET_CHAIN_ID;
    const arbitrumChainId = toHex(parseInt(chainId, 10)) as Hex;
    const baseToken: PerpsToken = {
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS,
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
  }, [tokenList, isIpfsGatewayEnabled, isTestnet]);

  // Destination token (Arbitrum USDC)
  const destToken = useMemo<PerpsToken>(() => {
    // Use appropriate chain ID and address based on network
    const chainId = isTestnet
      ? ARBITRUM_TESTNET_CHAIN_ID
      : ARBITRUM_MAINNET_CHAIN_ID;
    const usdcAddress = isTestnet
      ? USDC_ARBITRUM_TESTNET_ADDRESS
      : USDC_ARBITRUM_MAINNET_ADDRESS;
    const arbitrumChainId = toHex(parseInt(chainId, 10)) as Hex;

    const baseToken: PerpsToken = {
      symbol: USDC_SYMBOL,
      address: usdcAddress,
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
  }, [tokenList, isIpfsGatewayEnabled, isTestnet]);

  return {
    sourceToken,
    destToken,
  };
};
