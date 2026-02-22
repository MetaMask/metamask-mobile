/**
 * HyperLiquid SDK Type Aliases
 *
 * The @nktkas/hyperliquid SDK only exports Response types (e.g., ClearinghouseStateResponse).
 * We extract commonly-used nested types here to avoid repetitive type extraction syntax.
 *
 * Pattern: Import Response types, extract nested types using TypeScript index access.
 * This is the SDK's intentional design - not bad practice!
 */
import type {
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  MetaResponse,
  FrontendOpenOrdersResponse,
  MetaAndAssetCtxsResponse,
  AllMidsResponse,
  PredictedFundingsResponse,
  OrderParameters,
  SpotMetaResponse,
} from '@nktkas/hyperliquid';

// Clearinghouse (Account) Types
export type AssetPosition =
  ClearinghouseStateResponse['assetPositions'][number];
export type SpotBalance = SpotClearinghouseStateResponse['balances'][number];

// Market/Asset Types
export type PerpsUniverse = MetaResponse['universe'][number];
export type PerpsAssetCtx = MetaAndAssetCtxsResponse[1][number];
export type PredictedFunding = PredictedFundingsResponse[number];

// Order Types
export type FrontendOrder = FrontendOpenOrdersResponse[number];
export type SDKOrderParams = OrderParameters['orders'][number];
export type OrderType = FrontendOrder['orderType'];

// Re-export Response types for convenience
export type {
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  MetaResponse,
  FrontendOpenOrdersResponse,
  AllMidsResponse,
  MetaAndAssetCtxsResponse,
  PredictedFundingsResponse,
  SpotMetaResponse,
};
