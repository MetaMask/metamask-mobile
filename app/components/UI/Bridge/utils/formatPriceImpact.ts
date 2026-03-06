export const formatPriceImpact = (priceImpact?: string) => {
  if (!priceImpact) {
    return '0%';
  }

  const value = Number.parseFloat(priceImpact.replace('%', ''));

  if (!Number.isFinite(value)) {
    return '0%';
  }

  return value < 0 ? '0%' : value + '%';
};
