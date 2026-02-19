import {
  type PerpsSelectedPaymentToken,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '@metamask/perps-controller';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PERPS_MIN_BALANCE_THRESHOLD } from '../constants/perpsConfig';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { usePerpsNetwork } from './index';
import { usePerpsPaymentTokens } from './usePerpsPaymentTokens';

/**
 * When the user has no perps balance and the pay-with-any-token allowlist is enabled,
 * returns the allowlist token with the highest balance to use as the default payment method.
 * Otherwise returns null (caller should default to "Perps balance").
 */
export function useDefaultPayWithTokenWhenNoPerpsBalance(): PerpsSelectedPaymentToken | null {
  const perpsAccount = useSelector(selectPerpsAccountState);
  const allowlistAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const currentNetwork = usePerpsNetwork();
  const paymentTokens = usePerpsPaymentTokens();

  return useMemo(() => {
    const availableBalance = Number.parseFloat(
      perpsAccount?.availableBalance?.toString() ?? '0',
    );

    if (availableBalance > PERPS_MIN_BALANCE_THRESHOLD) {
      return null;
    }
    if (!allowlistAssets?.length) {
      return null;
    }

    const allowSet = new Set(allowlistAssets);
    const hyperliquidChainId =
      currentNetwork === 'testnet'
        ? HYPERLIQUID_TESTNET_CHAIN_ID
        : HYPERLIQUID_MAINNET_CHAIN_ID;

    const allowlistTokens = paymentTokens.filter((token) => {
      if (token.chainId === hyperliquidChainId) return false;
      const key = `${token.chainId}.${(token.address ?? '').toLowerCase()}`;
      return allowSet.has(key);
    });

    if (allowlistTokens.length === 0) return null;

    const tokensWithBalance = allowlistTokens.map((token) => ({
      ...token,
      balanceFiat: Number.parseFloat(token.balanceFiat?.replace('US$', '').trim() || '0'),
    })).sort((a, b) => b.balanceFiat - a.balanceFiat);

    const top = tokensWithBalance[0];

    if (top.balanceFiat < PERPS_MIN_BALANCE_THRESHOLD) return null;

    return {
      address: top.address as Hex,
      chainId: top.chainId as Hex,
      description: top.symbol,
    };
  }, [
    perpsAccount?.availableBalance,
    allowlistAssets,
    currentNetwork,
    paymentTokens,
  ]);
}
