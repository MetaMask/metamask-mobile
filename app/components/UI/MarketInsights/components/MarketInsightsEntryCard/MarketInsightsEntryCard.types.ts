import type { MarketInsightsReport } from '@metamask/ai-controllers';

export interface MarketInsightsEntryCardProps {
  /** The market insights report data */
  report: MarketInsightsReport;
  /** Relative time since the report was generated */
  timeAgo: string;
  /** Callback when the card is pressed to open the full view */
  onPress: () => void;
  /** The CAIP-19 asset ID, used to match the trace started by the parent */
  caip19Id: string;
  /** Optional test ID */
  testID?: string;
}
