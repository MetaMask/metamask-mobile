import type { MarketInsightsTrend } from '@metamask/ai-controllers';

export interface MarketInsightsTrendItemProps {
  /** The trend data to render */
  trend: MarketInsightsTrend;
  /** Optional callback when tapping the trend item */
  onPress?: () => void;
  /** Optional test ID */
  testID?: string;
}
