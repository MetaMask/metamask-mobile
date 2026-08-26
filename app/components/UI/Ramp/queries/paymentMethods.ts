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
  /** A preference, not a context: deliberately outside the query key. */
  preferPaymentMethodId?: string;
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
    } = normalizeContext(params);
    return [
      ...rampsPaymentMethodsKeys.all(),
      regionCode,
      assetId,
      providerId || 'auto',
      Boolean(restrictToKnownOrNativeProviders),
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
              preferPaymentMethodId: scope.preferPaymentMethodId,
            }),
      }),
    staleTime: staleTime ?? 0,
  });
};
