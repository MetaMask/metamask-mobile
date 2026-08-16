"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hyperLiquidModeFoldsSpot = exports.HL_UNIFIED_ACCOUNT_MODE = exports.HL_ABSTRACTION_WIRE = void 0;
/**
 * Wire codes accepted by `agentSetAbstraction({ abstraction })`. The SDK
 * types these as a `"i" | "u" | "p"` literal union with no exported constant.
 *
 * Only `unifiedAccount` is referenced by the current migration flow; the
 * other entries document the full SDK wire format so a future caller
 * (e.g. emergency rollback to `disabled`, or opting into `portfolioMargin`)
 * does not have to re-discover the codes.
 */
exports.HL_ABSTRACTION_WIRE = {
    disabled: 'i',
    unifiedAccount: 'u',
    portfolioMargin: 'p',
};
/**
 * Long-form abstraction-mode value targeted by the migration. Used as the
 * `abstraction` parameter for `userSetAbstraction` and as the success / target
 * value reported by Account Setup analytics.
 */
exports.HL_UNIFIED_ACCOUNT_MODE = 'unifiedAccount';
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
function hyperLiquidModeFoldsSpot(mode) {
    if (mode === null || mode === undefined) {
        return false;
    }
    return mode === 'unifiedAccount' || mode === 'portfolioMargin';
}
exports.hyperLiquidModeFoldsSpot = hyperLiquidModeFoldsSpot;
//# sourceMappingURL=hyperliquid-types.cjs.map