import type { CollectiblesCard, CollectiblesInventoryCard } from '../../types';
import { matchesSearch } from '../CollectiblesHome/discoveryFilters';

export interface SearchCard {
  card: CollectiblesInventoryCard;
  owned: boolean;
}

/** Search known metadata only. Ownership wins when a public feed repeats a mint. */
export function searchCards(
  ownedCards: CollectiblesCard[],
  publicCards: CollectiblesInventoryCard[],
  query: string,
): SearchCard[] {
  const cards = new Map<string, SearchCard>();
  ownedCards.forEach((card) => cards.set(card.mint, { card, owned: true }));
  publicCards.forEach((card) => {
    if (!cards.has(card.mint)) cards.set(card.mint, { card, owned: false });
  });
  return [...cards.values()].filter(({ card, owned }) =>
    matchesSearch(
      [
        card.name,
        card.set,
        card.grade,
        card.gradingCompany,
        card.rarity,
        card.mint,
        'category' in card ? card.category : '',
        'year' in card ? card.year : '',
        'packCode' in card ? card.packCode : '',
        owned ? 'owned' : '',
      ].join(' '),
      query,
    ),
  );
}

/** Paired rows let one virtualized list render both result types and headings. */
export function pairItems<Item>(items: Item[]): Item[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
    items.slice(index * 2, index * 2 + 2),
  );
}
