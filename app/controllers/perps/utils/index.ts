/**
 * Barrel re-export for all portable utilities in controllers/utils/
 *
 * Note: hyperLiquidAdapter and orderCalculations both export calculatePositionSize.
 * We use selective exports to avoid the name collision.
 */
export * from './accountUtils';
export * from './errorUtils';
// hyperLiquidAdapter: selective export to avoid calculatePositionSize clash with orderCalculations
export {
  adaptOrderToSDK,
  adaptPositionFromSDK,
  adaptOrderFromSDK,
  adaptMarketFromSDK,
  adaptAccountStateFromSDK,
  buildAssetMapping,
  formatHyperLiquidPrice,
  formatHyperLiquidSize,
  calculateHip3AssetId,
  parseAssetName,
  adaptHyperLiquidLedgerUpdateToUserHistoryItem,
} from './hyperLiquidAdapter';
export * from './hyperLiquidOrderBookProcessor';
export * from './hyperLiquidValidation';
export * from './idUtils';
export * from './marketDataTransform';
export * from './myxAdapter';
export * from './marketUtils';
export * from './orderCalculations';
export * from './rewardsUtils';
export * from './significantFigures';
export * from './sortMarkets';
export * from './standaloneInfoClient';
export * from './stringParseUtils';
export * from './transferData';
export * from './wait';

// Inline from former utils.ts (getEnvironment was previously at perps/utils.ts root)
export const getEnvironment = (): 'DEV' | 'PROD' => {
  const env = globalThis.process?.env?.NODE_ENV ?? 'production';
  return env === 'production' ? 'PROD' : 'DEV';
};
