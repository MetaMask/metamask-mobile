import type { WhatsHappeningItem } from './types';

/**
 * Shared properties bag for Whats Happening analytics events.
 * Used by CARD_SCROLLED_TO_VIEW, OPENED, VIEWED, INTERACTION, and CLOSED.
 *
 * Optional fields (`category`, `impact`) are stripped when undefined so
 * the resulting payload only includes keys that have a real value.
 */
export interface WhatsHappeningEventProps {
  event_id: string;
  card_index: number;
  category?: WhatsHappeningItem['category'];
  impact?: WhatsHappeningItem['impact'];
  asset_symbols: string[];
}

export const getWhatsHappeningEventProps = (
  item: WhatsHappeningItem,
  cardIndex: number,
): WhatsHappeningEventProps => ({
  event_id: item.id,
  card_index: cardIndex,
  ...(item.category ? { category: item.category } : {}),
  ...(item.impact ? { impact: item.impact } : {}),
  asset_symbols: item.relatedAssets.map((asset) => asset.symbol),
});
