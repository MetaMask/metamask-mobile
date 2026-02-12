import type { MarketInsightsSource } from '../../types/marketInsights';

export interface MarketInsightsSourcesFooterProps {
  /** List of sources used for the report */
  sources: MarketInsightsSource[];
  /** Optional test ID */
  testID?: string;
}
