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
  /** The CAIP-19 asset ID, used to match the trace started by the parent.
   * Optional, only provide this when a corresponding startTrace was initiated
   * by the parent component (AssetOverviewContent in the token details flow).
   */
  caip19Id?: CaipAssetType;
  /** Optional test ID */
  testID?: string;
}
