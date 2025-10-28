import type { Hex } from '@metamask/utils';
import { isEqual } from 'lodash';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  TRADING_DEFAULTS,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_DECIMALS,
  USDC_SYMBOL,
} from '../constants/hyperLiquidConfig';
import type { PerpsToken } from '../types/perps-types';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';
import { usePerpsNetwork } from './index';
import { usePerpsLiveAccount } from './stream';

/**
 * Hook to get all payment tokens for Perps, including:
 * - USDC on Hyperliquid (from Perps account) - always shown first
 * - All funded tokens across networks that meet minimum order requirement
 *
 * Tokens are sorted by priority:
 * 1. USDC on Hyperliquid (fastest, instant settlement)
 * 2. Other USDC tokens (easier to bridge)
 * 3. Other tokens sorted by balance (highest first)
 *
 * Only shows tokens with balance >= minimum order amount ($10 mainnet, $11 testnet)
 */
export function usePerpsPaymentTokens(): PerpsToken[] {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Use ref to store previous token array
  const previousTokensRef = useRef<PerpsToken[]>([]);

  // Get Hyperliquid account balance
  const { account } = usePerpsLiveAccount();
  const currentNetwork = usePerpsNetwork();
  const hyperliquidBalance = Number.parseFloat(
    account?.availableBalance?.toString() || '0',
  );

  // Get all chain IDs to search for tokens
  const allChainIds = useMemo(() => {
    if (!networkConfigurations) return [];
    return Object.keys(networkConfigurations) as Hex[];
  }, [networkConfigurations]);

  // Get all tokens with balances across networks
  const tokensWithBalance = useTokensWithBalance({ chainIds: allChainIds });

  // Filter and enhance tokens
  const paymentTokens = useMemo(() => {
    const tokens: PerpsToken[] = [];

    // Add Hyperliquid USDC as first token (special case)
    const hyperliquidChainId =
      currentNetwork === 'testnet'
        ? HYPERLIQUID_TESTNET_CHAIN_ID
        : HYPERLIQUID_MAINNET_CHAIN_ID;

    const hyperliquidUsdcBase = {
      address: USDC_ARBITRUM_MAINNET_ADDRESS,
      symbol: USDC_SYMBOL,
      name: 'USDC • Hyperliquid',
      decimals: USDC_DECIMALS,
      chainId: hyperliquidChainId as Hex,
      balance: (hyperliquidBalance * 1e6).toString(),
      balanceFiat: `$${hyperliquidBalance.toFixed(2)}`,
    };

    const hyperliquidUsdc: PerpsToken = enhanceTokenWithIcon({
      token: hyperliquidUsdcBase,
      tokenList: tokenList || {},
      isIpfsGatewayEnabled,
    });

    // Always show Hyperliquid USDC first (even if balance is 0)
    tokens.push(hyperliquidUsdc);

    // Filter for all tokens that meet minimum order requirement
    const minimumOrderAmount =
      currentNetwork === 'mainnet'
        ? TRADING_DEFAULTS.amount.mainnet
        : TRADING_DEFAULTS.amount.testnet;

    const otherFundedTokens = tokensWithBalance
      .filter((token) => {
        // Skip Hyperliquid chain tokens (already added above)
        if (token.chainId === hyperliquidChainId) return false;

        // Check if balance meets minimum order requirement
        const balanceFiat = Number.parseFloat(
          token.balanceFiat?.replace(/[^0-9.-]+/g, '') || '0',
        );
        return balanceFiat >= minimumOrderAmount;
      })
      .map((token) => {
        // Enhance with icon if needed
        const enhanced =
          tokenList && !token.image
            ? enhanceTokenWithIcon({
                token: {
                  symbol: token.symbol,
                  address: token.address,
                  decimals: token.decimals,
                  chainId: token.chainId as Hex,
                  name: token.name,
                },
                tokenList,
                isIpfsGatewayEnabled,
              })
            : token;

        return {
          ...enhanced,
          // Ensure we have all required fields
          balance: token.balance || '0',
          balanceFiat: token.balanceFiat || '$0.00',
        } as PerpsToken;
      });

    // Sort tokens by priority:
    // 1. USDC tokens first (faster to bridge)
    // 2. Then by balance (highest first)
    const sortedTokens = [...otherFundedTokens].sort((a, b) => {
      // Prioritize USDC
      if (a.symbol === USDC_SYMBOL && b.symbol !== USDC_SYMBOL) return -1;
      if (b.symbol === USDC_SYMBOL && a.symbol !== USDC_SYMBOL) return 1;

      // Then sort by balance
      const aBalance = Number.parseFloat(
        a.balanceFiat?.replace(/[^0-9.-]+/g, '') || '0',
      );
      const bBalance = Number.parseFloat(
        b.balanceFiat?.replace(/[^0-9.-]+/g, '') || '0',
      );
      return bBalance - aBalance;
    });

    tokens.push(...sortedTokens);

    // Future: Add other supported tokens here

    return tokens;
  }, [
    tokensWithBalance,
    hyperliquidBalance,
    currentNetwork,
    tokenList,
    isIpfsGatewayEnabled,
  ]);

  // Check if tokens have actually changed using lodash deep equality
  const tokensChanged = !isEqual(previousTokensRef.current, paymentTokens);

  // Only update the reference if tokens have actually changed
  if (tokensChanged) {
    previousTokensRef.current = paymentTokens;
  }

  // Return the stable reference if tokens haven't changed
  return tokensChanged ? paymentTokens : previousTokensRef.current;
}
