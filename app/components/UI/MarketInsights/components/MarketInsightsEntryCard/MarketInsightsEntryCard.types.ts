import type { MarketInsightsReport } from '@metamask-previews/ai-controllers';

export interface MarketInsightsEntryCardProps {
  /** The market insights report data */
  report: MarketInsightsReport;
  /** Relative time since the report was generated */
  timeAgo: string;
  /** Callback when the card is pressed to open the full view */
  onPress: () => void;
  /** Optional test ID */
  testID?: string;
}
