import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { selectUserRegion } from '../../../../../selectors/rampsController';
import { rampsPaymentMethodsOptions } from '../../../../UI/Ramp/queries/paymentMethods';
import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from '../../../../UI/Ramp/utils/getMoneyAccountFiatDepositAssetId';

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
 *   Falls back to `MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID` when not provided.
 */
export function useMoneyAccountDepositPaymentMethods(
  caipAssetId?: string,
): UseMoneyAccountDepositPaymentMethodsResult {
  const userRegion = useSelector(selectUserRegion);
  const regionCode = userRegion?.regionCode ?? '';
  const fiat = userRegion?.country?.currency ?? '';

  const assetId = caipAssetId ?? MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID;

  const { data: provider = null } = useQuery({
    // Use `userRegion?.regionCode` DIRECTLY in the key (not the `?? ''`
    // normalized `regionCode`) so this query shares a cache entry with
    // `useRampsBuyLimits`, which uses the same key shape.
    queryKey: ['ramps', 'bestProvider', assetId, userRegion?.regionCode],
    queryFn: () =>
      Engine.context.RampsController.getBestProviderForAsset({ assetId }),
    enabled: Boolean(regionCode),
    staleTime: 5 * 60 * 1000,
  });

  const paymentMethodsQuery = useQuery({
    ...rampsPaymentMethodsOptions({
      regionCode,
      fiat,
      assetId,
      providerId: provider?.id ?? '',
    }),
    enabled: Boolean(regionCode && fiat && provider?.id),
  });

  return {
    paymentMethods: paymentMethodsQuery.data ?? [],
    isReady: Boolean(provider && paymentMethodsQuery.isSuccess),
  };
}
