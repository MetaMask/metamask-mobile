import type { CollectorCryptPack } from '../../providers/collector-crypt/types';
import { COLLECTOR_CRYPT_RARITIES } from '../../providers/collector-crypt/constants';
import { parseUsdcAmount } from '../../providers/collector-crypt/utils/format';
import { getRarityLabel } from '../CardDisplay/cardLabels';

/** 0.015 -> "1.5%". */
export const formatOddsPercent = (fraction: number): string =>
  `${Number((fraction * 100).toFixed(2))}%`;

/** "Common 80% · Uncommon 15% · Rare 4% · Epic 1%" (zero tiers skipped). */
export const formatOddsLine = (odds: CollectorCryptPack['odds']): string =>
  COLLECTOR_CRYPT_RARITIES.filter((rarity) => odds[rarity] > 0)
    .map(
      (rarity) =>
        `${getRarityLabel(rarity)} ${formatOddsPercent(odds[rarity])}`,
    )
    .join(' · ');

/** 1234.4 -> "1,234". */
export const formatWholeNumber = (value: number): string =>
  Math.round(value).toLocaleString('en-US');

/** 50 -> "50", 12.5 -> "12.50". */
export const formatPackPrice = (price: number): string =>
  Number.isInteger(price) ? String(price) : price.toFixed(2);

/** Pack price in USDC base units. */
export const getPackPriceBaseUnits = (price: number): bigint =>
  parseUsdcAmount(price);

/** True when the balance (base units) covers the pack price. */
export const canAffordPack = (balance: bigint, price: number): boolean =>
  balance >= getPackPriceBaseUnits(price);
