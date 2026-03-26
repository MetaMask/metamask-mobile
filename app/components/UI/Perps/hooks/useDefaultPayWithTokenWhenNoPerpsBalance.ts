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

export interface DefaultPayTokenResult {
  token: PerpsSelectedPaymentToken | null;
  /** Fiat balance (USD) of the selected token; undefined when no token selected */
  balanceUsd: number | undefined;
}

/**
 * When the user has no perps balance and the pay-with-any-token allowlist is enabled,
 * returns the allowlist token with the highest balance to use as the default payment method.
 * Otherwise returns null (caller should default to "Perps balance").
 */
export function useDefaultPayWithTokenWhenNoPerpsBalance(): DefaultPayTokenResult {
  const featureEnabled = useSelector(
    selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag,
  );
  const perpsAccount = useSelector(selectPerpsAccountState);
  const allowlistAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const activeProvider = useSelector(selectPerpsProvider);
  const currentNetwork = usePerpsNetwork();
  const paymentTokens = usePerpsPaymentTokens();

  const NO_TOKEN: DefaultPayTokenResult = useMemo(
    () => ({ token: null, balanceUsd: undefined }),
    [],
  );

  return useMemo(() => {
    if (!featureEnabled) {
      return NO_TOKEN;
    }
    const availableBalance = Number.parseFloat(
      perpsAccount?.availableBalance?.toString() ?? '0',
    );

    if (availableBalance > PERPS_MIN_BALANCE_THRESHOLD) {
      return NO_TOKEN;
    }
    if (!allowlistAssets?.length) {
      return NO_TOKEN;
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

    const allowlistTokens = paymentTokens.filter((token) => {
      if (
        perpsProviderChainId !== undefined &&
        token.chainId === perpsProviderChainId
      )
        return false;
      const key = `${token.chainId}.${(token.address ?? '').toLowerCase()}`;
      return allowSet.has(key);
    });

    if (allowlistTokens.length === 0) return NO_TOKEN;

    const tokensWithBalance = allowlistTokens
      .map((token) => ({
        ...token,
        balanceFiat: Number.parseFloat(
          token.balanceFiat?.replace(/[^0-9.-]/g, '') || '0',
        ),
      }))
      .sort((a, b) => b.balanceFiat - a.balanceFiat);

    const top = tokensWithBalance[0];

    if (top.balanceFiat < PERPS_MIN_BALANCE_THRESHOLD) return NO_TOKEN;

    return {
      token: {
        address: top.address as Hex,
        chainId: top.chainId as Hex,
        description: top.symbol,
      },
      balanceUsd: top.balanceFiat,
    };
  }, [
    NO_TOKEN,
    featureEnabled,
    perpsAccount?.availableBalance,
    allowlistAssets,
    activeProvider,
    currentNetwork,
    paymentTokens,
  ]);
}
