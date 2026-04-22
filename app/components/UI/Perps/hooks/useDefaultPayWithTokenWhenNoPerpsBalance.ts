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

export function arePaymentTokensEqual(
  tokenA: Pick<PerpsSelectedPaymentToken, 'address' | 'chainId'> | null,
  tokenB: Pick<PerpsSelectedPaymentToken, 'address' | 'chainId'> | null,
): boolean {
  if (!tokenA || !tokenB) {
    return false;
  }
  return tokenA.address === tokenB.address && tokenA.chainId === tokenB.chainId;
}

function computePreferredFallbackPayTokenCandidate(params: {
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
    )
      return false;
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
}

/**
 * True when the account has enough buying power to place a perps order from its
 * native balance (HL Unified folds spot USDC/USDH into availableToTradeBalance).
 */
export function useHasNativeTradeablePerpsBalance(): boolean {
  const perpsAccount = useSelector(selectPerpsAccountState);
  return useMemo(
    () =>
      Number.parseFloat(
        perpsAccount?.availableToTradeBalance?.toString() ??
          perpsAccount?.availableBalance?.toString() ??
          '0',
      ) > PERPS_MIN_BALANCE_THRESHOLD,
    [perpsAccount],
  );
}

/**
 * Same allowlist-based fallback candidate as useDefaultPayWithTokenWhenNoPerpsBalance,
 * but without the "user has perps balance" gate. Used by useInitPerpsPaymentToken to
 * detect saved tokens that were previously auto-selected when perps balance was empty.
 */
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
      computePreferredFallbackPayTokenCandidate({
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

/**
 * When the user has no perps buying power and the pay-with-any-token allowlist is enabled,
 * returns the allowlist token with the highest balance to use as the default payment method.
 * Otherwise returns null (caller should default to "Perps balance").
 */
export function useDefaultPayWithTokenWhenNoPerpsBalance(): PerpsSelectedPaymentToken | null {
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

  return useMemo(() => {
    if (!featureEnabled) {
      return null;
    }
    // Gate on tradeable balance (withdrawable + spot USDC/USDH in HL Unified).
    // Falls back to availableBalance for legacy or partially migrated AccountState payloads.
    const tradeableBalance = Number.parseFloat(
      perpsAccount?.availableToTradeBalance?.toString() ??
        perpsAccount?.availableBalance?.toString() ??
        '0',
    );

    if (tradeableBalance > PERPS_MIN_BALANCE_THRESHOLD) {
      return null;
    }

    return computePreferredFallbackPayTokenCandidate({
      featureEnabled,
      allowlistAssets,
      activeProvider,
      currentNetwork,
      paymentTokens,
    });
  }, [
    featureEnabled,
    perpsAccount?.availableToTradeBalance,
    perpsAccount?.availableBalance,
    allowlistAssets,
    activeProvider,
    currentNetwork,
    paymentTokens,
  ]);
}
