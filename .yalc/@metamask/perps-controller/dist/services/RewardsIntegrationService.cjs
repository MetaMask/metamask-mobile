"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _RewardsIntegrationService_instances, _RewardsIntegrationService_deps, _RewardsIntegrationService_messenger, _RewardsIntegrationService_benefitsSnapshot, _RewardsIntegrationService_lastAttemptAt, _RewardsIntegrationService_benefitsRefresh, _RewardsIntegrationService_benefitsEpoch, _RewardsIntegrationService_getChainIdForNetwork, _RewardsIntegrationService_readSubscriptionBenefits, _RewardsIntegrationService_calculateRewardsDiscount;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardsIntegrationService = void 0;
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const rewardsUtils_js_1 = require("../utils/rewardsUtils.cjs");
/**
 * Default MetaMask builder fee, in basis points.
 * This is the fee every user pays when no cheaper source applies.
 */
const DEFAULT_FEE_BIPS = hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR;
/**
 * RewardsIntegrationService
 *
 * Owns the unified perps fee resolver: it considers every fee source and
 * returns the lowest fee, expressed as the discount bips providers consume.
 *
 * Sources, all in fee basis points (lowest wins):
 * - `default` — {@link BUILDER_FEE_CONFIG}, the fee with no reductions.
 * - `rewards` — VIP and season, collapsed into one discount by
 *   `RewardsController` (`rewards.getPerpsDiscountForAccount`), so this service
 *   does not re-derive the VIP/season split.
 * - `subscription` — `0` bips, but only when the eligibility gate passes on a
 *   cached read of the profile's benefits.
 *
 * On a tie the cheaper-to-explain source wins, in the order
 * `subscription` > `rewards` > `default`.
 *
 * The benefits cache is stale-while-revalidate: fee resolution is a pure read
 * of the cached snapshot, while preview and lifecycle callers refresh it
 * explicitly. Nothing is reserved or committed client-side, so backend
 * exhaustion needs no release logic — the next refresh simply stops passing
 * the gate.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
class RewardsIntegrationService {
    /**
     * Create a new RewardsIntegrationService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps, messenger) {
        _RewardsIntegrationService_instances.add(this);
        _RewardsIntegrationService_deps.set(this, void 0);
        _RewardsIntegrationService_messenger.set(this, void 0);
        /** Last successful benefits read, or undefined before the first one. */
        _RewardsIntegrationService_benefitsSnapshot.set(this, void 0);
        /**
         * When the last benefits read finished, successful or not.
         *
         * Separate from `#benefitsSnapshot.fetchedAt`, which only advances on
         * success: a failing read must still throttle the next preview refresh,
         * otherwise an outage turns every fee preview into a new request.
         */
        _RewardsIntegrationService_lastAttemptAt.set(this, void 0);
        /** In-flight refresh, deduped so only one runs at a time. */
        _RewardsIntegrationService_benefitsRefresh.set(this, void 0);
        /**
         * Identity generation for the cached benefits.
         *
         * Bumped by {@link invalidateSubscriptionBenefits}; a read that resolves
         * against a superseded epoch is discarded rather than written back, so a
         * refresh issued for the previous profile cannot repopulate the cache after
         * a sign-out or profile switch.
         */
        _RewardsIntegrationService_benefitsEpoch.set(this, 0);
        __classPrivateFieldSet(this, _RewardsIntegrationService_deps, deps, "f");
        __classPrivateFieldSet(this, _RewardsIntegrationService_messenger, messenger, "f");
    }
    /**
     * Calculate user fee discount from the unified fee resolver.
     * Returns discount in basis points (e.g., 6500 = 65% discount)
     *
     * @returns The fee discount in basis points, or undefined if no source resolved.
     */
    async calculateUserFeeDiscount() {
        const resolution = await this.resolveFee();
        return resolution.discountBips;
    }
    /**
     * Resolve the MetaMask builder fee across every source and return the lowest.
     *
     * Never throws and never starts a subscription benefits read: a failing or
     * unresolved cached source simply drops out of the comparison, so the worst
     * case is the default fee rather than an error or an over-granted waiver.
     *
     * @returns The winning fee, its source, and the subscription gate outcome.
     */
    async resolveFee() {
        const rewardsDiscountBips = await __classPrivateFieldGet(this, _RewardsIntegrationService_instances, "m", _RewardsIntegrationService_calculateRewardsDiscount).call(this);
        // Pure cache read: subscription benefits must never start a network request
        // while an order is being prepared for signing.
        const subscription = this.getSubscriptionFeeWaiverStatus();
        let feeBips = DEFAULT_FEE_BIPS;
        let source = 'default';
        if (rewardsDiscountBips !== undefined) {
            const rewardsFeeBips = DEFAULT_FEE_BIPS * (1 - rewardsDiscountBips / hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR);
            // `<=` so an equal rewards fee still reports the rewards source, keeping
            // a resolved 0% discount distinguishable from an unresolved one.
            if (rewardsFeeBips <= feeBips) {
                feeBips = rewardsFeeBips;
                source = 'rewards';
            }
        }
        // Nothing can undercut a waived fee, so the gate passing always wins.
        if (subscription.eligible) {
            feeBips = 0;
            source = 'subscription';
        }
        const discountBips = source === 'default'
            ? undefined
            : Math.round((1 - feeBips / DEFAULT_FEE_BIPS) * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR);
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Fee resolved', {
            source,
            feeBips,
            discountBips,
            defaultFeeBips: DEFAULT_FEE_BIPS,
            rewardsDiscountBips,
            subscriptionEligible: subscription.eligible,
            subscriptionReason: subscription.reason,
        });
        return { feeBips, discountBips, source, subscription };
    }
    /**
     * Read the subscription fee-waiver gate from the cached benefits snapshot.
     *
     * Synchronous and side-effect free. The returned value always comes from
     * what is already cached; preview and lifecycle callers own hydration.
     *
     * @returns Whether the waiver applies, why, and the remaining notional.
     */
    getSubscriptionFeeWaiverStatus() {
        if (!__classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").subscription) {
            return { eligible: false, reason: 'no-source' };
        }
        const now = Date.now();
        const snapshot = __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsSnapshot, "f");
        const age = snapshot ? now - snapshot.fetchedAt : Infinity;
        if (!snapshot) {
            return { eligible: false, reason: 'not-hydrated' };
        }
        if (age > perpsConfig_js_1.SUBSCRIPTION_BENEFITS_CACHE.MaxStaleMs) {
            // Past the ceiling we cannot tell whether the cap is still available, so
            // fall back to the next-lowest source rather than over-granting.
            return { eligible: false, reason: 'stale' };
        }
        return evaluateFeeWaiverGate(snapshot.benefits);
    }
    /**
     * Refresh the cached subscription benefits snapshot.
     *
     * Deduped: concurrent callers share the in-flight request. Rejections are
     * logged and swallowed, leaving the previous snapshot in place. Preview and
     * lifecycle callers invoke this outside order submission.
     *
     * @returns A promise that settles when the refresh completes.
     */
    async refreshSubscriptionBenefits() {
        const source = __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").subscription;
        if (!source) {
            return;
        }
        if (__classPrivateFieldGet(this, _RewardsIntegrationService_benefitsRefresh, "f")) {
            await __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsRefresh, "f");
            return;
        }
        const now = Date.now();
        const snapshotAge = __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsSnapshot, "f")
            ? now - __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsSnapshot, "f").fetchedAt
            : Infinity;
        const sinceAttempt = __classPrivateFieldGet(this, _RewardsIntegrationService_lastAttemptAt, "f") === undefined ? Infinity : now - __classPrivateFieldGet(this, _RewardsIntegrationService_lastAttemptAt, "f");
        if (snapshotAge < perpsConfig_js_1.SUBSCRIPTION_BENEFITS_CACHE.FreshMs ||
            sinceAttempt < perpsConfig_js_1.SUBSCRIPTION_BENEFITS_CACHE.FreshMs) {
            return;
        }
        const refresh = __classPrivateFieldGet(this, _RewardsIntegrationService_instances, "m", _RewardsIntegrationService_readSubscriptionBenefits).call(this, source);
        __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsRefresh, refresh, "f");
        // `finally` always defers, so this never clears the handle we just set.
        refresh
            .finally(() => {
            if (__classPrivateFieldGet(this, _RewardsIntegrationService_benefitsRefresh, "f") === refresh) {
                __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsRefresh, undefined, "f");
            }
        })
            .catch(() => undefined);
        await refresh;
    }
    /**
     * Drop the cached benefits snapshot.
     *
     * Call this when the identity behind the benefits changes — sign-out, or a
     * profile switch — since the snapshot carries no profile identity of its own
     * and would otherwise keep answering for the previous profile until the next
     * successful refresh. The next status read reports `not-hydrated`, so the
     * waiver is withheld until a preview or lifecycle caller hydrates it.
     */
    invalidateSubscriptionBenefits() {
        __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsSnapshot, undefined, "f");
        __classPrivateFieldSet(this, _RewardsIntegrationService_lastAttemptAt, undefined, "f");
        // Fence any in-flight read: it was issued for the previous identity, so its
        // result must not repopulate the cache after this point.
        __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsEpoch, __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsEpoch, "f") + 1, "f");
        // Drop the dedupe handle too. The fenced read can only be discarded, so
        // leaving it in place would make the next refresh await it instead of
        // fetching for the new identity. Its `finally` guard compares against the
        // current handle, so it will not clear whatever replaces it here.
        __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsRefresh, undefined, "f");
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Subscription benefits cache invalidated');
    }
}
exports.RewardsIntegrationService = RewardsIntegrationService;
_RewardsIntegrationService_deps = new WeakMap(), _RewardsIntegrationService_messenger = new WeakMap(), _RewardsIntegrationService_benefitsSnapshot = new WeakMap(), _RewardsIntegrationService_lastAttemptAt = new WeakMap(), _RewardsIntegrationService_benefitsRefresh = new WeakMap(), _RewardsIntegrationService_benefitsEpoch = new WeakMap(), _RewardsIntegrationService_instances = new WeakSet(), _RewardsIntegrationService_getChainIdForNetwork = function _RewardsIntegrationService_getChainIdForNetwork(networkClientId) {
    try {
        const networkClient = __classPrivateFieldGet(this, _RewardsIntegrationService_messenger, "f").call('NetworkController:getNetworkClientById', networkClientId);
        return networkClient.configuration.chainId;
    }
    catch {
        // Network client may not exist
        return undefined;
    }
}, _RewardsIntegrationService_readSubscriptionBenefits = 
/**
 * Perform one benefits read and store it, keeping the previous snapshot on
 * error. Never rejects, so callers cannot produce an unhandled rejection.
 *
 * @param source - The injected subscription benefits source.
 */
async function _RewardsIntegrationService_readSubscriptionBenefits(source) {
    const epoch = __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsEpoch, "f");
    try {
        const benefits = await source.getPerpsBenefits();
        if (epoch !== __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsEpoch, "f")) {
            // Invalidated while this read was in flight: it belongs to a previous
            // identity, so discarding it is the only safe outcome.
            __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Discarding benefits read from a previous identity');
            return;
        }
        __classPrivateFieldSet(this, _RewardsIntegrationService_benefitsSnapshot, { benefits, fetchedAt: Date.now() }, "f");
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Subscription benefits refreshed', {
            status: benefits?.status,
            entitled: benefits?.perpsFeeWaiver?.entitled,
            usage: benefits?.perpsFeeWaiver?.usage,
            exhausted: benefits?.perpsFeeWaiver?.exhausted,
        });
    }
    catch (error) {
        // Keep the previous snapshot: an unreachable benefits endpoint must not
        // erase a valid cache, and it must never grant the waiver either.
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'RewardsIntegrationService.refreshSubscriptionBenefits'), {
            tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
            context: {
                name: 'RewardsIntegrationService.refreshSubscriptionBenefits',
                data: {},
            },
        });
    }
    finally {
        // Recorded on failure too — this is what throttles the retry loop. Not
        // recorded for a fenced read: that attempt belongs to a previous
        // identity, and letting it throttle would delay the new identity's first
        // fetch by a whole freshness window.
        if (epoch === __classPrivateFieldGet(this, _RewardsIntegrationService_benefitsEpoch, "f")) {
            __classPrivateFieldSet(this, _RewardsIntegrationService_lastAttemptAt, Date.now(), "f");
        }
    }
}, _RewardsIntegrationService_calculateRewardsDiscount = 
/**
 * Resolve the rewards (VIP + season) discount for the selected account.
 *
 * @returns The discount in basis points, or undefined when unavailable.
 */
async function _RewardsIntegrationService_calculateRewardsDiscount() {
    try {
        const evmAccount = (0, accountUtils_js_1.getSelectedEvmAccountFromMessenger)(__classPrivateFieldGet(this, _RewardsIntegrationService_messenger, "f"));
        if (!evmAccount) {
            __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: No EVM account found for fee discount');
            return undefined;
        }
        // Get the chain ID via DI network controller
        const networkState = __classPrivateFieldGet(this, _RewardsIntegrationService_messenger, "f").call('NetworkController:getState');
        const { selectedNetworkClientId } = networkState;
        const chainId = __classPrivateFieldGet(this, _RewardsIntegrationService_instances, "m", _RewardsIntegrationService_getChainIdForNetwork).call(this, selectedNetworkClientId);
        if (!chainId) {
            __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").logger.error(new Error('Chain ID not found for fee discount calculation'), {
                tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'RewardsIntegrationService.calculateUserFeeDiscount',
                    data: {
                        selectedNetworkClientId,
                    },
                },
            });
            return undefined;
        }
        // Use pure utility function for CAIP formatting (pass logger for error reporting)
        const caipAccountId = (0, rewardsUtils_js_1.formatAccountToCaipAccountId)(evmAccount.address, chainId, __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").logger);
        if (!caipAccountId) {
            __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").logger.error(new Error('Failed to format CAIP account ID for fee discount'), {
                tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'RewardsIntegrationService.calculateUserFeeDiscount',
                    data: {
                        address: evmAccount.address,
                        chainId,
                        selectedNetworkClientId,
                    },
                },
            });
            return undefined;
        }
        // Use rewards via DI (no RewardsController in Core yet).
        // The rewards controller needs the perps MetaMask builder base fee in
        // bips to convert an absolute VIP fee into a discount fraction.
        const discountBips = await __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").rewards.getPerpsDiscountForAccount(caipAccountId, DEFAULT_FEE_BIPS);
        // null = subscription state not hydrated yet; surface as undefined so
        // callers don't treat it as a definitive "no discount" answer.
        if (discountBips === null) {
            __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Fee discount unavailable (subscription state not hydrated)', { address: evmAccount.address, caipAccountId });
            return undefined;
        }
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").debugLogger.log('RewardsIntegrationService: Fee discount calculated', {
            address: evmAccount.address,
            caipAccountId,
            discountBips,
            discountPercentage: discountBips / 100,
        });
        return discountBips;
    }
    catch (error) {
        __classPrivateFieldGet(this, _RewardsIntegrationService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'RewardsIntegrationService.calculateUserFeeDiscount'), {
            tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
            context: {
                name: 'RewardsIntegrationService.calculateUserFeeDiscount',
                data: {},
            },
        });
        return undefined;
    }
};
/**
 * Evaluate the perps fee-waiver eligibility gate against a benefits snapshot.
 *
 * The gate is `status=active` AND `perpsFeeWaiver` entitled AND
 * `usage=available`. A backend `exhausted` flag (or an `exhausted` usage) fails
 * the gate on its own; anything short of an affirmative `available` is treated
 * as not entitled, because the waiver is only granted on positive evidence.
 * A `null` payload means there is no subscription at all, which is reported
 * separately from a subscription that exists but is not active.
 *
 * @param benefits - The cached benefits payload, or null when there is none.
 * @returns The gate outcome plus the remaining notional when reported.
 */
function evaluateFeeWaiverGate(benefits) {
    const waiver = benefits?.perpsFeeWaiver;
    const { remainingNotionalUsd } = waiver ?? {};
    // `null` is the DI contract's "nothing to report" (signed out, no profile),
    // which is distinct from a subscription that exists but is not active.
    if (benefits === null) {
        return { eligible: false, reason: 'no-subscription' };
    }
    if (benefits.status !== 'active') {
        return { eligible: false, reason: 'inactive', remainingNotionalUsd };
    }
    if (waiver?.entitled !== true) {
        return { eligible: false, reason: 'not-entitled', remainingNotionalUsd };
    }
    if (waiver.exhausted === true || waiver.usage === 'exhausted') {
        return { eligible: false, reason: 'exhausted', remainingNotionalUsd };
    }
    if (waiver.usage !== 'available') {
        return { eligible: false, reason: 'not-entitled', remainingNotionalUsd };
    }
    return { eligible: true, reason: 'eligible', remainingNotionalUsd };
}
//# sourceMappingURL=RewardsIntegrationService.cjs.map