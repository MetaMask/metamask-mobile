import { queryOptions } from '@tanstack/react-query';
import type { PaymentMethodsForContextResponse } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { normalizeAssetIdForApi } from '../utils/normalizeAssetIdForApi';

export interface PaymentMethodsQueryParams {
  regionCode: string;
  assetId: string;
  /** Explicit provider scope (UB2 Buy). Omit to let the controller resolve. */
  providerId?: string;
  /** Controller resolves the providers for the asset (MM Pay deposits). */
  autoSelectProvider?: boolean;
  restrictToKnownOrNativeProviders?: boolean;
  /** Buy owns the shared catalog; deposit contexts must pass `false`. */
  updateState: boolean;
}

const normalizeContext = (params: PaymentMethodsQueryParams) => ({
  ...params,
  regionCode: params.regionCode.trim().toLowerCase(),
  assetId: normalizeAssetIdForApi(params.assetId.trim()),
  providerId: params.providerId?.trim(),
});

export const rampsPaymentMethodsKeys = {
  all: () => ['ramps', 'paymentMethods'] as const,
  detail: (params: PaymentMethodsQueryParams) => {
    const scope = normalizeContext(params);
    // `updateState` is in the key so a read-only deposit request never serves,
    // or is served by, a Buy request that also writes the shared catalog.
    return [
      ...rampsPaymentMethodsKeys.all(),
      scope.regionCode,
      scope.assetId,
      scope.providerId || 'auto',
      Boolean(scope.restrictToKnownOrNativeProviders),
      scope.updateState,
    ] as const;
  },
};

export const rampsPaymentMethodsOptions = (
  params: PaymentMethodsQueryParams,
) => {
  const scope = normalizeContext(params);

  return queryOptions({
    queryKey: rampsPaymentMethodsKeys.detail(params),
    queryFn: async (): Promise<PaymentMethodsForContextResponse> =>
      Engine.context.RampsController.getPaymentMethodsForContext({
        region: scope.regionCode,
        assetId: scope.assetId,
        updateState: scope.updateState,
        ...(scope.providerId
          ? { providers: [scope.providerId] }
          : {
              autoSelectProvider: scope.autoSelectProvider,
              restrictToKnownOrNativeProviders:
                scope.restrictToKnownOrNativeProviders,
            }),
      }),
    // Read-only requests cache for 5 minutes; state-writing ones must not: the
    // controller commits the catalog and its selection as a side effect of the
    // fetch, so a silent cache hit would leave `RampsController.paymentMethods`
    // stale for the context the user just entered.
    staleTime: scope.updateState ? 0 : 5 * 60 * 1000,
  });
};
