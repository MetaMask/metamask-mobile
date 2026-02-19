import type { MarketInsightsTrend } from '@metamask/ai-controllers';

export interface MarketInsightsTrendItemProps {
  /** The trend data to render */
  trend: MarketInsightsTrend;
  /** Optional test ID */
  testID?: string;
}
