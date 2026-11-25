import type { PerpsSelectedPaymentToken } from '@metamask/perps-controller';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  getPerpsProviderChainId,
  PERPS_MIN_BALANCE_THRESHOLD,
  PROVIDER_CONFIG,
} from '../constants/perpsConfig';
import {
  selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag,
  selectPerpsPayWithAnyTokenAllowlistAssets,
} from '../selectors/featureFlags';
import {
  selectPerpsAccountState,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { usePerpsNetwork } from './index';
import { usePerpsPaymentTokens } from './usePerpsPaymentTokens';
import {
  readAvailableToTradeUsd,
  usePerpsLiveAvailableToTrade,
} from './stream/usePerpsLiveAvailableToTrade';

/**
 * When the user has no perps balance and the pay-with-any-token allowlist is enabled,
 * returns the allowlist token with the highest balance to use as the default payment method.
 * Otherwise returns null (caller should default to "Perps balance").
 *
 * With a `symbol`, the Perps balance is the venue's available to trade for that
 * market (the larger side, since no order direction is chosen yet), and no
 * token is returned until it reports. Without a symbol, or after a stream
 * error, it falls back to the account `spendableBalance`.
 */
export function useDefaultPayWithTokenWhenNoPerpsBalance(
  symbol?: string,
): PerpsSelectedPaymentToken | null {
  const featureEnabled = useSelector(
    selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag,
  );
  const perpsAccount = useSelector(selectPerpsAccountState);
  const allowlistAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const activeProvider = useSelector(selectPerpsProvider);
  const currentNetwork = usePerpsNetwork();
  const paymentTokens = usePerpsPaymentTokens(symbol);
  const { availableToTrade, isInitialLoading: isAvailableToTradeLoading } =
    usePerpsLiveAvailableToTrade({
      symbol: symbol ?? '',
      enabled: featureEnabled && Boolean(symbol),
    });
  const availableLong = readAvailableToTradeUsd(availableToTrade, 'long');
  const availableShort = readAvailableToTradeUsd(availableToTrade, 'short');

  return useMemo(() => {
    if (!featureEnabled || isAvailableToTradeLoading) {
      return null;
    }
    const venueAvailableToTrade =
      availableLong === undefined && availableShort === undefined
        ? undefined
        : Math.max(availableLong ?? 0, availableShort ?? 0);
    const perpsBalance =
      venueAvailableToTrade ??
      Number.parseFloat(perpsAccount?.spendableBalance?.toString() ?? '0');

    if (perpsBalance > PERPS_MIN_BALANCE_THRESHOLD) {
      return null;
    }
    if (!allowlistAssets?.length) {
      return null;
    }

    const allowSet = new Set(allowlistAssets);
    const effectiveProvider =
      activeProvider === 'aggregated' || activeProvider === undefined
        ? PROVIDER_CONFIG.DefaultProvider
        : activeProvider;
    const perpsProviderChainId = getPerpsProviderChainId(
      effectiveProvider,
      currentNetwork,
    );
    // An unmapped provider has no supported pay-with-token deposit route.
    if (perpsProviderChainId === undefined) return null;

    const allowlistTokens = paymentTokens.filter((token) => {
      if (token.chainId === perpsProviderChainId) return false;
      const key = `${token.chainId}.${(token.address ?? '').toLowerCase()}`;
      return allowSet.has(key);
    });

    if (allowlistTokens.length === 0) return null;

    const tokensWithBalance = allowlistTokens
      .map((token) => ({
        ...token,
        balanceFiat: Number.parseFloat(
          token.balanceFiat?.replace('US$', '').trim() || '0',
        ),
      }))
      .sort((a, b) => b.balanceFiat - a.balanceFiat);

    const top = tokensWithBalance[0];

    if (top.balanceFiat < PERPS_MIN_BALANCE_THRESHOLD) return null;

    return {
      address: top.address as Hex,
      chainId: top.chainId as Hex,
      description: top.symbol,
    };
  }, [
    featureEnabled,
    isAvailableToTradeLoading,
    availableLong,
    availableShort,
    perpsAccount?.spendableBalance,
    allowlistAssets,
    activeProvider,
    currentNetwork,
    paymentTokens,
  ]);
}
