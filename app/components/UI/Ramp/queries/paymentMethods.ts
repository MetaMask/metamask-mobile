import { queryOptions } from '@tanstack/react-query';
import type { PaymentMethodsForContextResponse } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { normalizeAssetIdForApi } from '../utils/normalizeAssetIdForApi';

/**
 * Read-only requests cache for 5 minutes. State-writing requests
 * (`updateState: true`) must not: the controller commits the catalog and its
 * selection as a side effect of the fetch, so a silent cache hit would leave
 * `RampsController.paymentMethods` stale for the context the user just entered.
 */
const staleTimeFor = (updateState: boolean) =>
  updateState ? 0 : 5 * 60 * 1000;

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
  staleTime?: number;
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
    const {
      regionCode,
      assetId,
      providerId,
      restrictToKnownOrNativeProviders,
      updateState,
    } = normalizeContext(params);
    // `updateState` is part of the key: a read-only deposit request must never
    // be served from, or serve, a Buy request that also writes the shared
    // catalog.
    return [
      ...rampsPaymentMethodsKeys.all(),
      regionCode,
      assetId,
      providerId || 'auto',
      Boolean(restrictToKnownOrNativeProviders),
      updateState,
    ] as const;
  },
};

export const rampsPaymentMethodsOptions = (
  params: PaymentMethodsQueryParams,
) => {
  const { regionCode, assetId, providerId, staleTime, ...scope } =
    normalizeContext(params);

  return queryOptions({
    queryKey: rampsPaymentMethodsKeys.detail(params),
    queryFn: async (): Promise<PaymentMethodsForContextResponse> =>
      Engine.context.RampsController.getPaymentMethodsForContext({
        region: regionCode,
        assetId,
        updateState: scope.updateState,
        ...(providerId
          ? { providers: [providerId] }
          : {
              autoSelectProvider: scope.autoSelectProvider,
              restrictToKnownOrNativeProviders:
                scope.restrictToKnownOrNativeProviders,
            }),
      }),
    staleTime: staleTime ?? staleTimeFor(scope.updateState),
  });
};
