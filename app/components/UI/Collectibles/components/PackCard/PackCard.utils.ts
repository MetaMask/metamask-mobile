/** 50 -> "50", 12.5 -> "12.50". */
export const formatPackPrice = (price: number): string =>
  Number.isInteger(price) ? String(price) : price.toFixed(2);
