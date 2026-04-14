import type { Provider } from '@metamask/ramps-controller';

export interface ProviderBuyLimit {
  minAmount: number;
  maxAmount: number;
  feeFixedRate?: number;
  feeDynamicRate?: number;
}

export function getProviderBuyLimit(
  provider: Provider | null | undefined,
  fiatCurrency: string | null | undefined,
  paymentMethodId: string | null | undefined,
): ProviderBuyLimit | undefined {
  if (!provider || !fiatCurrency || !paymentMethodId) {
    return undefined;
  }

  return provider.limits?.fiat?.[fiatCurrency.toLowerCase()]?.[paymentMethodId];
}
