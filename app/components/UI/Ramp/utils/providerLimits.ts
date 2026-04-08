import type { Provider } from '@metamask/ramps-controller';

export interface ProviderBuyLimit {
  minAmount: number;
  maxAmount: number;
  feeFixedRate?: number;
  feeDynamicRate?: number;
}

type ProviderWithBuyLimits = Provider & {
  limits?: {
    fiat?: Record<string, Record<string, ProviderBuyLimit>>;
  };
};

export function getProviderBuyLimit(
  provider: Provider | null | undefined,
  fiatCurrency: string | null | undefined,
  paymentMethodId: string | null | undefined,
): ProviderBuyLimit | undefined {
  if (!provider || !fiatCurrency || !paymentMethodId) {
    return undefined;
  }

  const providerWithBuyLimits = provider as ProviderWithBuyLimits;

  return providerWithBuyLimits.limits?.fiat?.[fiatCurrency.toLowerCase()]?.[
    paymentMethodId
  ];
}
