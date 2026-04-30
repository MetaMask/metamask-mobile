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
 *
 * Only `unifiedAccount` is referenced by the current migration flow; the
 * other entries document the full SDK wire format so a future caller
 * (e.g. emergency rollback to `disabled`, or opting into `portfolioMargin`)
 * does not have to re-discover the codes.
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
 * collateral. Fail-CLOSED on missing mode: until userAbstraction has been
 * resolved we do not fold spot, because over-reporting withdrawable funds
 * for Standard / dexAbstraction users (which `withdraw3` cannot actually
 * draw) is worse than briefly under-reporting for Unified users during the
 * initial subscription window or a transient REST outage.
 *
 * @param mode - Abstraction mode returned by HyperLiquid.
 * @returns Whether spot balances should fold into perps collateral.
 */
export function hyperLiquidModeFoldsSpot(
  mode?: UserAbstractionResponse | null,
): boolean {
  if (mode === null || mode === undefined) {
    return false;
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
