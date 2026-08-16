import type { PerpsFeeResolution, PerpsPlatformDependencies, PerpsSubscriptionFeeWaiverStatus } from "../types/index.mjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.mjs";
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
export declare class RewardsIntegrationService {
    #private;
    /**
     * Create a new RewardsIntegrationService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps: PerpsPlatformDependencies, messenger: PerpsControllerMessengerBase);
    /**
     * Calculate user fee discount from the unified fee resolver.
     * Returns discount in basis points (e.g., 6500 = 65% discount)
     *
     * @returns The fee discount in basis points, or undefined if no source resolved.
     */
    calculateUserFeeDiscount(): Promise<number | undefined>;
    /**
     * Resolve the MetaMask builder fee across every source and return the lowest.
     *
     * Never throws and never starts a subscription benefits read: a failing or
     * unresolved cached source simply drops out of the comparison, so the worst
     * case is the default fee rather than an error or an over-granted waiver.
     *
     * @returns The winning fee, its source, and the subscription gate outcome.
     */
    resolveFee(): Promise<PerpsFeeResolution>;
    /**
     * Read the subscription fee-waiver gate from the cached benefits snapshot.
     *
     * Synchronous and side-effect free. The returned value always comes from
     * what is already cached; preview and lifecycle callers own hydration.
     *
     * @returns Whether the waiver applies, why, and the remaining notional.
     */
    getSubscriptionFeeWaiverStatus(): PerpsSubscriptionFeeWaiverStatus;
    /**
     * Refresh the cached subscription benefits snapshot.
     *
     * Deduped: concurrent callers share the in-flight request. Rejections are
     * logged and swallowed, leaving the previous snapshot in place. Preview and
     * lifecycle callers invoke this outside order submission.
     *
     * @returns A promise that settles when the refresh completes.
     */
    refreshSubscriptionBenefits(): Promise<void>;
    /**
     * Drop the cached benefits snapshot.
     *
     * Call this when the identity behind the benefits changes — sign-out, or a
     * profile switch — since the snapshot carries no profile identity of its own
     * and would otherwise keep answering for the previous profile until the next
     * successful refresh. The next status read reports `not-hydrated`, so the
     * waiver is withheld until a preview or lifecycle caller hydrates it.
     */
    invalidateSubscriptionBenefits(): void;
}
//# sourceMappingURL=RewardsIntegrationService.d.mts.map