import type { WhatsHappeningItem } from './types';
import type { WhatsHappeningSourceValue } from './constants';

/**
 * Shared properties bag for Whats Happening analytics events.
 * Used by CARD_SCROLLED_TO_VIEW, DETAILS_VIEWED,
 * DETAILS_INTERACTED, and DETAILS_CLOSED.
 *
 * Optional fields (`trend_category`, `trend_impact`) are stripped when
 * undefined so the resulting payload only includes keys that have a value.
 *
 * The shape is widened with `Record<string, unknown>` so the result can be
 * passed directly to `AnalyticsEventBuilder.addProperties`, which expects
 * an index-signature-compatible bag.
 */
export type WhatsHappeningEventProps = {
  trend_id: string;
  card_index: number;
  trend_category?: WhatsHappeningItem['category'];
  trend_impact?: WhatsHappeningItem['impact'];
  asset_symbols: string[];
  source: WhatsHappeningSourceValue;
} & Record<string, unknown>;

export const getWhatsHappeningEventProps = (
  item: WhatsHappeningItem,
  cardIndex: number,
  source: WhatsHappeningSourceValue,
): WhatsHappeningEventProps => ({
  trend_id: item.id,
  card_index: cardIndex,
  ...(item.category ? { trend_category: item.category } : {}),
  ...(item.impact ? { trend_impact: item.impact } : {}),
  asset_symbols: item.relatedAssets.map((asset) => asset.symbol),
  source,
});
