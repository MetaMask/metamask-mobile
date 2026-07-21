interface QuoteLike {
  quote?: {
    priceData?: {
      priceImpact?: {
        amount?: string | null;
      } | null;
    } | null;
  } | null;
}

export const hasMissingPriceData = (quote?: QuoteLike | null) => {
  const priceData = quote?.quote?.priceData;

  return !priceData || !priceData.priceImpact || !priceData.priceImpact.amount;
};
