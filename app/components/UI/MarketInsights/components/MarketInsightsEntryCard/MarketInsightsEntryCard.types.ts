import type { MarketInsightsReport } from '@metamask/ai-controllers';
import type { CaipAssetType } from '@metamask/utils';

export interface MarketInsightsEntryCardProps {
  /** The market insights report data */
  report: MarketInsightsReport;
  /** Relative time since the report was generated */
  timeAgo: string;
  /** Callback when the card is pressed to open the full view */
  onPress: () => void;
  /** Callback when the disclaimer info icon is pressed */
  onDisclaimerPress?: () => void;
  /** CAIP-19 asset ID used by token-details analytics. It remains a fallback
   * trace identifier for callers that have not supplied `traceId`.
   */
  caip19Id?: CaipAssetType;
  /** Identifier for the entry-card time-to-content trace owned by the parent. */
  traceId?: string;
  /** Surface from which the Market Insights feature was accessed */
  source: 'token_details' | 'perps' | 'unknown';
  /** Optional test ID */
  testID?: string;
}
