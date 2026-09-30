import type { GachaHomeTab } from '../../../../UI/Gacha/types/navigation';

/** Max cards shown on the homepage. */
export const MAX_GACHA_CARDS_DISPLAYED = 6;

/** Cards per grid row. */
export const GACHA_CARDS_PER_ROW = 3;

/**
 * Splits items into rows of `size` items (last row may be shorter).
 * @param items - Items to split.
 * @param size - Row size, at least 1.
 * @returns Rows in order.
 */
export const toRows = <T>(items: readonly T[], size: number): T[][] => {
  const rowSize = Math.max(1, Math.floor(size));
  return Array.from({ length: Math.ceil(items.length / rowSize) }, (_, i) =>
    items.slice(i * rowSize, (i + 1) * rowSize),
  );
};

/**
 * Module tab opened by the section header: the user's cards when there are
 * any, the packs otherwise.
 * @param hasCards - Whether the account owns at least one card.
 * @returns The CollectorCrypt home tab to open.
 */
export const getGachaHeaderTab = (hasCards: boolean): GachaHomeTab =>
  hasCards ? 'cards' : 'packs';
