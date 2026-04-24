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
  UserAbstractionResponse,
} from '@nktkas/hyperliquid';

/**
 * HL account abstraction mode returned by the `userAbstraction` info endpoint.
 * Re-exported here to keep HL-specific types centralised.
 *
 * `unifiedAccount` / `portfolioMargin` / `default`: spot is unified with perps;
 * `withdraw3` draws from the unified ledger, spot folds into perps collateral.
 *
 * `disabled` (Standard) / `dexAbstraction` (deprecated): spot and perps are
 * separate ledgers; spot is NOT auto-collateral.
 */
export type HyperLiquidAbstractionMode = UserAbstractionResponse;

/**
 * True when the given HL abstraction mode treats spot USDC as perps collateral.
 * Used by the provider + subscription service to gate `addSpotBalanceToAccountState`'s
 * `foldIntoCollateral` option.
 *
 * @param mode - Abstraction mode from `userAbstraction` endpoint; null/undefined means unknown.
 * @returns `true` when spot folds into spendable/withdrawable; `false` for Standard / DEX abstraction.
 */
export function hyperLiquidModeFoldsSpot(
  mode?: HyperLiquidAbstractionMode | null,
): boolean {
  if (mode === null || mode === undefined) {
    return true; // Unknown mode defaults to Unified (app.hyperliquid.xyz default).
  }
  return (
    mode === 'unifiedAccount' ||
    mode === 'portfolioMargin' ||
    mode === 'default'
  );
}

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
