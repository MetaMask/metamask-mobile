import type { IndexedCard } from '../../services/clients/CollectiblesApiClient';
import type { CollectiblesInventoryCard } from '../../types';

/** Historical metadata can be previewed but never becomes actionable owned inventory. */
export const indexedCardPreview = (
  card: IndexedCard,
): CollectiblesInventoryCard => ({
  mint: card.cardId,
  name: card.name,
  image: card.imageUrl,
  mediumImage: card.thumbnailUrl,
  rarity: card.rarity,
  grade: card.grade ?? undefined,
  insuredValue:
    card.insuredValue === null ? undefined : Number(card.insuredValue),
});
