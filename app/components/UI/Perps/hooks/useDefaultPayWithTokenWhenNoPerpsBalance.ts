import {
  type PerpsSelectedPaymentToken,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '@metamask/perps-controller';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
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

  const minBalanceThreshold = 0.01;

  return useMemo(() => {
    const availableBalance = Number.parseFloat(
      perpsAccount?.availableBalance?.toString() ?? '0',
    );

    if (availableBalance > minBalanceThreshold) {
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

    const byBalance = [...allowlistTokens].sort((a, b) => {
      const aFiat = Number.parseFloat(
        a.balanceFiat?.replace('US$', '').trim() || '0',
      );
      const bFiat = Number.parseFloat(
        b.balanceFiat?.replace('US$', '').trim() || '0',
      );
      return bFiat - aFiat;
    });

    const top = byBalance[0];
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
