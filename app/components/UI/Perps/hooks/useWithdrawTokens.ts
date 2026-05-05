import { toHex } from '@metamask/controller-utils';
import { useMemo } from 'react';

import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
  ZERO_ADDRESS,
  type PerpsToken,
} from '@metamask/perps-controller';

/**
 * TODO: make the hook dynamic once we manage multiple perps provider.
 * Currently speicifc to hyperliquid.
 *
 * Hook to manage source and destination tokens for withdrawal
 * @returns Source and destination token configurations
 */
export const useWithdrawTokens = () => {
  // Source token (Hyperliquid USDC)
  const sourceToken = useMemo<PerpsToken>(
    () => ({
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: HYPERLIQUID_MAINNET_CHAIN_ID,
      currencyExchangeRate: 1,
    }),
    [],
  );

  // Destination token (Arbitrum USDC)
  const destToken = useMemo<PerpsToken>(
    () => ({
      symbol: USDC_SYMBOL,
      address: USDC_ARBITRUM_MAINNET_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: toHex(Number.parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10)),
      currencyExchangeRate: 1,
    }),
    [],
  );

  return {
    sourceToken,
    destToken,
  };
};
