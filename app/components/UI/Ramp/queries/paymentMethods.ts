import { queryOptions } from '@tanstack/react-query';
import type { PaymentMethodsForContextResponse } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { normalizeAssetIdForApi } from '../utils/normalizeAssetIdForApi';

interface PaymentMethodsQueryParams {
  regionCode: string;
  assetId: string;
  providerId: string;
}

const normalizePaymentMethodsContext = ({
  regionCode,
  assetId,
  providerId,
}: PaymentMethodsQueryParams): PaymentMethodsQueryParams => ({
  regionCode: regionCode.trim().toLowerCase(),
  assetId: normalizeAssetIdForApi(assetId.trim()),
  providerId: providerId.trim(),
});

export const rampsPaymentMethodsKeys = {
  all: () => ['ramps', 'paymentMethods'] as const,
  detail: (params: PaymentMethodsQueryParams) => {
    const { regionCode, assetId, providerId } =
      normalizePaymentMethodsContext(params);
    return [
      ...rampsPaymentMethodsKeys.all(),
      regionCode,
      assetId,
      providerId,
    ] as const;
  },
};

export const rampsPaymentMethodsOptions = (
  params: PaymentMethodsQueryParams,
) => {
  const { regionCode, assetId, providerId } =
    normalizePaymentMethodsContext(params);

  return queryOptions({
    queryKey: rampsPaymentMethodsKeys.detail(params),
    queryFn: async (): Promise<PaymentMethodsForContextResponse> =>
      Engine.context.RampsController.getPaymentMethodsForContext({
        region: regionCode,
        assetId,
        providers: [providerId],
        updateState: true,
      }),
    staleTime: 0,
  });
};
