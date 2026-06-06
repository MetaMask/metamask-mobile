import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import { rampsPaymentMethodsOptions } from '../queries/paymentMethods';
import { useMoneyAccountFiatDepositAssetId } from './useMoneyAccountFiatDepositAssetId';

export interface UseMoneyAccountDepositPaymentMethodsResult {
  /**
   * Payment methods available for the asset's best provider.
   * Empty when the provider or methods have not resolved yet.
   */
  paymentMethods: PaymentMethod[];
  /**
   * True once both the provider and its payment methods have successfully
   * resolved. The caller should gate on this before using paymentMethods.
   * Note: a successful response with zero methods still yields `isReady: true`
   * (an empty `paymentMethods` list), so callers must handle the empty case.
   */
  isReady: boolean;
  /**
   * True while at least one query is actively in-flight. Unlike `!isSettled`,
   * this stays false when the region has not loaded yet (queries disabled), so
   * the caller can distinguish "waiting for a network response" from "queries
   * haven't started yet". Use this as the wait-condition in effects that must
   * not make a decision until all relevant data has arrived.
   */
  isLoading: boolean;
}

/**
 * Resolves payment methods for the fiat moneyAccountDeposit path by:
 *   1. Calling `getBestProviderForAsset` for the fiat deposit asset (or the
 *      asset id supplied by the current fiat payment state) via React Query —
 *      same query-key shape as `useRampsBuyLimits` so results are shared.
 *   2. Fetching payment methods for THAT provider via React Query, using
 *      `rampsPaymentMethodsOptions`.
 *
 * This avoids relying on the globally-selected `providers.selected`, which may
 * be null or point to a different provider in non-Transak regions.
 *
 * @param caipAssetId - Optional CAIP-19 asset id from the fiat payment state.
 *   Falls back to the flag-resolved money-account deposit asset (mUSD, or the
 *   `MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID` native-ETH constant when the flag is
 *   absent) — matching the gate in `useCanFiatDepositAsset` so both resolve the
 *   provider for the SAME asset.
 */
export function useMoneyAccountDepositPaymentMethods(
  caipAssetId?: string,
): UseMoneyAccountDepositPaymentMethodsResult {
  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';
  const fiat = userRegion?.country?.currency ?? '';

  const flagAssetId = useMoneyAccountFiatDepositAssetId();
  const assetId = caipAssetId ?? flagAssetId;

  const providerEnabled = Boolean(regionCode);
  const providerQuery = useQuery({
    // Use `userRegion?.regionCode` DIRECTLY in the key (not the `?? ''`
    // normalized `regionCode`) so this query shares a cache entry with
    // `useRampsBuyLimits`, which uses the same key shape.
    queryKey: ['ramps', 'bestProvider', assetId, userRegion?.regionCode],
    queryFn: () =>
      Engine.context.RampsController.getBestProviderForAsset({ assetId }),
    enabled: providerEnabled,
    staleTime: 5 * 60 * 1000,
  });
  const provider = providerQuery.data ?? null;

  const paymentMethodsEnabled = Boolean(regionCode && fiat && provider?.id);
  const paymentMethodsQuery = useQuery({
    ...rampsPaymentMethodsOptions({
      regionCode,
      fiat,
      assetId,
      providerId: provider?.id ?? '',
    }),
    enabled: paymentMethodsEnabled,
  });

  const isReady = Boolean(provider && paymentMethodsQuery.isSuccess);

  // True only while a network request is actually in-flight. Stays false when
  // queries are disabled (region not loaded yet), so callers can use this as
  // a precise "still fetching" signal distinct from "not started".
  const isLoading =
    providerEnabled &&
    (providerQuery.isLoading ||
      Boolean(
        provider && paymentMethodsEnabled && paymentMethodsQuery.isLoading,
      ));

  return {
    paymentMethods: paymentMethodsQuery.data ?? [],
    isReady,
    isLoading,
  };
}
