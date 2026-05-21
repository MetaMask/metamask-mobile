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
 * `unifiedAccount` / `portfolioMargin`: spot is unified with perps;
 * `withdraw3` draws from the unified ledger, spot folds into perps collateral.
 *
 * `disabled` (Standard) / `dexAbstraction` (deprecated) / `default` (unset):
 * spot and perps are separate ledgers; spot is NOT auto-collateral until the
 * user is migrated to unified mode.
 */
export type HyperLiquidAbstractionMode = UserAbstractionResponse;

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
 * True when the given HL abstraction mode treats spot USDC as perps collateral.
 * Used by the provider + subscription service to gate `addSpotBalanceToAccountState`'s
 * `foldIntoCollateral` option.
 *
 * Fail-CLOSED on missing mode: until userAbstraction has been resolved we do
 * NOT fold spot, because over-reporting withdrawable funds for Standard /
 * dexAbstraction users (which `withdraw3` cannot actually draw) is worse than
 * briefly under-reporting for Unified users during the initial subscription
 * window or a transient REST outage.
 *
 * @param mode - Abstraction mode from `userAbstraction` endpoint; null/undefined means unknown.
 * @returns `true` when spot folds into spendable/withdrawable (Unified / Portfolio); `false` for Standard / DEX abstraction / unknown.
 */
export function hyperLiquidModeFoldsSpot(
  mode?: HyperLiquidAbstractionMode | null,
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
