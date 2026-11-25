import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type {
  CatalogPack,
  ListedPack,
  PackCategoryMapping,
} from '../types/packs';

/**
 * Packs and chips for the Packs tab. Hides closed and unpriced packs, sorts by
 * price then chip order, and drops chips with no pack. Without a mapping only
 * "All" shows.
 */
export function buildPacksCatalog(
  packs: CatalogPack[],
  mapping?: PackCategoryMapping,
) {
  const mappedCategories = mapping?.categories ?? [];
  const chipOrder = new Map(
    mappedCategories.map((category, index) => [category.id, index]),
  );

  const listedPacks: ListedPack[] = packs.flatMap((pack) => {
    if (!pack.isMachineOpen || pack.priceUsd === undefined) {
      return [];
    }
    const categoryId = mapping?.packCategories[pack.code];
    return [
      {
        ...pack,
        priceUsd: pack.priceUsd,
        categoryId:
          categoryId && chipOrder.has(categoryId) ? categoryId : undefined,
      },
    ];
  });

  function rankOf(pack: ListedPack) {
    return chipOrder.get(pack.categoryId ?? '') ?? mappedCategories.length;
  }
  listedPacks.sort((a, b) => a.priceUsd - b.priceUsd || rankOf(a) - rankOf(b));

  const categories = mappedCategories.filter((category) =>
    listedPacks.some((pack) => pack.categoryId === category.id),
  );

  return { packs: listedPacks, categories };
}

export function formatPackPrice(priceUsd: number) {
  const fractionDigits = Number.isInteger(priceUsd) ? 0 : 2;
  const amount = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(priceUsd);
  return `$${amount}`;
}
