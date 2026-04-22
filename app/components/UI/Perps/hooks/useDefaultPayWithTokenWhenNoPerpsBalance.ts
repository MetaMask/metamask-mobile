import type {
  AccountState,
  PerpsSelectedPaymentToken,
} from '@metamask/perps-controller';
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

function getTradeablePerpsBalance(
  perpsAccount:
    | Pick<AccountState, 'availableBalance' | 'availableToTradeBalance'>
    | null
    | undefined,
): number {
  return Number.parseFloat(
    perpsAccount?.availableToTradeBalance?.toString() ??
      perpsAccount?.availableBalance?.toString() ??
      '0',
  );
}

function getIsNativeTradeablePerpsBalanceAvailable(
  perpsAccount:
    | Pick<AccountState, 'availableBalance' | 'availableToTradeBalance'>
    | null
    | undefined,
): boolean {
  return getTradeablePerpsBalance(perpsAccount) > PERPS_MIN_BALANCE_THRESHOLD;
}

function arePaymentTokensEqual(
  tokenA: Pick<PerpsSelectedPaymentToken, 'address' | 'chainId'> | null,
  tokenB: Pick<PerpsSelectedPaymentToken, 'address' | 'chainId'> | null,
): boolean {
  if (!tokenA || !tokenB) {
    return false;
  }

  return tokenA.address === tokenB.address && tokenA.chainId === tokenB.chainId;
}

function getPreferredFallbackPayTokenCandidate(params: {
  featureEnabled: boolean;
  allowlistAssets?: string[];
  activeProvider?: string;
  currentNetwork: ReturnType<typeof usePerpsNetwork>;
  paymentTokens: ReturnType<typeof usePerpsPaymentTokens>;
}): PerpsSelectedPaymentToken | null {
  const {
    featureEnabled,
    allowlistAssets,
    activeProvider,
    currentNetwork,
    paymentTokens,
  } = params;

  if (!featureEnabled || !allowlistAssets?.length) {
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

  const allowlistTokens = paymentTokens.filter((token) => {
    if (
      perpsProviderChainId !== undefined &&
      token.chainId === perpsProviderChainId
    ) {
      return false;
    }

    const key = `${token.chainId}.${(token.address ?? '').toLowerCase()}`;
    return allowSet.has(key);
  });

  if (allowlistTokens.length === 0) {
    return null;
  }

  const top = allowlistTokens
    .map((token) => ({
      ...token,
      balanceFiat: Number.parseFloat(
        token.balanceFiat?.replace('US$', '').trim() || '0',
      ),
    }))
    .sort((tokenA, tokenB) => tokenB.balanceFiat - tokenA.balanceFiat)[0];

  if (top.balanceFiat < PERPS_MIN_BALANCE_THRESHOLD) {
    return null;
  }

  return {
    address: top.address as Hex,
    chainId: top.chainId as Hex,
    description: top.symbol,
  };
}

export function useHasNativeTradeablePerpsBalance(): boolean {
  const perpsAccount = useSelector(selectPerpsAccountState);

  return useMemo(
    () => getIsNativeTradeablePerpsBalanceAvailable(perpsAccount),
    [perpsAccount],
  );
}

export function usePreferredFallbackPayTokenCandidate(): PerpsSelectedPaymentToken | null {
  const featureEnabled = useSelector(
    selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag,
  );
  const allowlistAssets = useSelector(
    selectPerpsPayWithAnyTokenAllowlistAssets,
  );
  const activeProvider = useSelector(selectPerpsProvider);
  const currentNetwork = usePerpsNetwork();
  const paymentTokens = usePerpsPaymentTokens();

  return useMemo(
    () =>
      getPreferredFallbackPayTokenCandidate({
        featureEnabled,
        allowlistAssets,
        activeProvider,
        currentNetwork,
        paymentTokens,
      }),
    [
      featureEnabled,
      allowlistAssets,
      activeProvider,
      currentNetwork,
      paymentTokens,
    ],
  );
}

export { arePaymentTokensEqual };

/**
 * Returns the default fallback pay token only when native Perps tradeable balance
 * is unavailable. Otherwise returns null so the caller defaults to "Perps balance".
 */
export function useDefaultPayWithTokenWhenNoPerpsBalance(): PerpsSelectedPaymentToken | null {
  const hasNativeTradeablePerpsBalance = useHasNativeTradeablePerpsBalance();
  const fallbackCandidate = usePreferredFallbackPayTokenCandidate();

  return useMemo(() => {
    if (hasNativeTradeablePerpsBalance) {
      return null;
    }

    return fallbackCandidate;
  }, [hasNativeTradeablePerpsBalance, fallbackCandidate]);
}
