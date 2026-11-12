import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesCard, CollectiblesRarity } from '../../types';

/** Prefer Set metadata; use the provider's name only when Set is absent. */
export const getCardTitle = (
  card: Pick<CollectiblesCard, 'set' | 'name'>,
): string => (card.set?.trim() ? card.set : card.name);

/** Localized rarity name. */
export const getRarityLabel = (rarity: CollectiblesRarity): string =>
  strings(`collectibles.rarity.${rarity}`);

/** "PSA GEM-MT 10", or undefined when the card has no grade. */
export const getGradeLabel = (
  card: Pick<CollectiblesCard, 'grade' | 'gradingCompany'>,
): string | undefined => {
  const label = [card.gradingCompany, card.grade]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
  return label || undefined;
};
