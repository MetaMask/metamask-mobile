import type { MarketInsightsTrend } from '../../types/marketInsights';

export interface MarketInsightsTrendItemProps {
  /** The trend data to render */
  trend: MarketInsightsTrend;
  /** Optional test ID */
  testID?: string;
}
