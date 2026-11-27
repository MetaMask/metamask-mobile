import { strings } from '../../../../../locales/i18n';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const buybackWindowMs = 72 * hourMs;

export const getCollectionValue = (cards: PackPartnerCard[]) =>
  cards.reduce((total, card) => total + (card.insuredValue ?? 0), 0);

export const sortNewestFirst = (cards: PackPartnerCard[]) =>
  [...cards].sort((a, b) => b.acquiredAt - a.acquiredAt);

export function searchCardsByName(cards: PackPartnerCard[], query: string) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return cards;
  }

  return cards.filter((card) => card.name.toLowerCase().includes(term));
}

export function getBuybackLabel(card: PackPartnerCard, now: number) {
  if (card.buyback.status !== 'available' || !card.acquiredAt) {
    return undefined;
  }

  const timeLeftMs = card.acquiredAt + buybackWindowMs - now;

  if (timeLeftMs <= 0) {
    return undefined;
  }

  if (timeLeftMs < hourMs) {
    return strings('collectibles.collection.buyback_minutes', {
      count: Math.max(1, Math.floor(timeLeftMs / minuteMs)),
    });
  }

  return strings('collectibles.collection.buyback_hours', {
    count: Math.floor(timeLeftMs / hourMs),
  });
}
