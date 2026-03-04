export const formatPriceImpact = (priceImpact?: string) => {
  if (!priceImpact) {
    return '0';
  }

  const value = Number.parseFloat(priceImpact.replace('%', ''));

  return value < 0 ? '0%' : value + '%';
};
