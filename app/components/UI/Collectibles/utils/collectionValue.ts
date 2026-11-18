import type { CollectiblesCard } from '../types';

/** Total insured value in USD of the complete, unfiltered owned collection. */
export const getCollectionValueUsd = (
  cards: readonly Pick<CollectiblesCard, 'insuredValue'>[],
): number => cards.reduce((total, card) => total + (card.insuredValue ?? 0), 0);
