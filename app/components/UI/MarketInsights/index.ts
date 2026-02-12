// Main exports for Market Insights module
export { default as MarketInsightsView } from './Views/MarketInsightsView';
export { default as MarketInsightsEntryCard } from './components/MarketInsightsEntryCard';
export { selectMarketInsightsEnabled } from '../../../selectors/featureFlagController/marketInsights';
export { useMarketInsights } from './hooks/useMarketInsights';
export type { MarketInsightsReport } from './types/marketInsights';
