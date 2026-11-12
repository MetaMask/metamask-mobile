import { canonicalPackCategory } from '../../utils/packClassification';
import type { CollectiblesPack, CollectiblesInventoryCard } from '../../types';

/** Resolve an exact source first. A category recommendation is never provenance. */
export function resolveDiscoveryPack(
  card: CollectiblesInventoryCard,
  packs: CollectiblesPack[],
  sourcePackType?: string,
) {
  const source = packs.find((pack) =>
    sourcePackType
      ? sourcePackType === `pack_partner:${pack.code}`
      : card.sourcePackCode === pack.code,
  );
  const category = canonicalPackCategory('', card.category, card.name);
  const recommended = category
    ? packs
        .filter(
          (pack) =>
            canonicalPackCategory(
              pack.code,
              pack.category ?? undefined,
              pack.name,
            ) === category,
        )
        .sort((left, right) => left.price - right.price)[0]
    : undefined;
  return { source, buyPack: source ?? recommended };
}
