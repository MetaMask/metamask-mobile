import type { DeepPartial, QuoteResponse } from '@metamask/bridge-controller';

export const hasMissingPriceData = (
  quote?: DeepPartial<QuoteResponse> | null,
) => {
  const priceData = quote?.quote?.priceData;

  return !priceData?.priceImpact?.amount;
};
