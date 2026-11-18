import { useMemo } from 'react';
import type { PackPartnerCard } from '../types';
import { useBuybackOffers } from './useBuybackOffer';

/**
 * Enriches only the supplied cards with their current buyback offers. A
 * collection can pass all cards for its eligibility counter and filter;
 * previews without buyback information need no offer reads at all.
 *
 * @param cards - Cards whose offers the consumer needs.
 * @param enabled - Whether the consumer is active.
 * @returns Cards with the latest cached offers, preserving sale receipts.
 */
export const usePackPartnerCardOffers = (
  cards: PackPartnerCard[],
  enabled: boolean,
): PackPartnerCard[] => {
  const mints = useMemo(
    () =>
      cards
        .filter((card) => card.buyback.status === 'unknown' && !card.sale)
        .map((card) => card.mint),
    [cards],
  );
  const offers = useBuybackOffers(mints, enabled);
  return useMemo(
    () =>
      cards.map((card) =>
        !card.sale && offers[card.mint]
          ? { ...card, buyback: offers[card.mint] }
          : card,
      ),
    [cards, offers],
  );
};
