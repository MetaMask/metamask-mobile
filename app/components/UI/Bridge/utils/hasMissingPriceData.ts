interface QuoteLike {
  quote?: {
    priceData?: {
      priceImpact?: string | null;
    } | null;
  } | null;
}

export const hasMissingPriceData = (quote?: QuoteLike | null) => {
  const priceData = quote?.quote?.priceData;

  return (
    !priceData || priceData.priceImpact == null || priceData.priceImpact === ''
  );
};
