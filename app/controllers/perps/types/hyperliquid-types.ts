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
 * Wire codes accepted by `agentSetAbstraction({ abstraction })`. The SDK
 * types these as a `"i" | "u" | "p"` literal union with no exported constant.
 */
export const HL_ABSTRACTION_WIRE = {
  disabled: 'i',
  unifiedAccount: 'u',
  portfolioMargin: 'p',
} as const;

/**
 * Long-form abstraction-mode value targeted by the migration. Used as the
 * `abstraction` parameter for `userSetAbstraction` and as the success / target
 * value reported by Account Setup analytics.
 */
export const HL_UNIFIED_ACCOUNT_MODE = 'unifiedAccount' as const;

/**
 * True when the given HL abstraction mode treats spot balances as perps
 * collateral. Missing mode is treated as Unified to avoid under-reporting
 * usable balance during a transient userAbstraction fetch failure.
 *
 * @param mode - Abstraction mode returned by HyperLiquid.
 * @returns Whether spot balances should fold into perps collateral.
 */
export function hyperLiquidModeFoldsSpot(
  mode?: UserAbstractionResponse | null,
): boolean {
  if (mode === null || mode === undefined) {
    return true;
  }

  return mode === 'unifiedAccount' || mode === 'portfolioMargin';
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
  UserAbstractionResponse,
};
