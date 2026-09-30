import { parseUsdcAmount } from '../../providers/collector-crypt/utils/format';

/** 50 -> "50", 12.5 -> "12.50". */
export const formatPackPrice = (price: number): string =>
  Number.isInteger(price) ? String(price) : price.toFixed(2);

/** Pack price in USDC base units. */
export const getPackPriceBaseUnits = (price: number): bigint =>
  parseUsdcAmount(price);

/** True when the balance (base units) covers the pack price. */
export const canAffordPack = (balance: bigint, price: number): boolean =>
  balance >= getPackPriceBaseUnits(price);
