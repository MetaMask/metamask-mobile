/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { RewardsController } from './RewardsController';

/**
 * Calculate tier status and next tier information
 */
export type RewardsControllerCalculateTierStatusAction = {
  type: `RewardsController:calculateTierStatus`;
  handler: RewardsController['calculateTierStatus'];
};

/**
 * Combine season metadata and season state into a SeasonStatusDto
 */
export type RewardsControllerConvertToSeasonStatusDtoAction = {
  type: `RewardsController:convertToSeasonStatusDto`;
  handler: RewardsController['convertToSeasonStatusDto'];
};

/**
 * Reset controller state to default
 */
export type RewardsControllerResetStateAction = {
  type: `RewardsController:resetState`;
  handler: RewardsController['resetState'];
};

/**
 * Returns the rewards API base URL the data service is currently targeting.
 */
export type RewardsControllerGetRewardsEnvUrlAction = {
  type: `RewardsController:getRewardsEnvUrl`;
  handler: RewardsController['getRewardsEnvUrl'];
};

/**
 * Returns whether the current MetaMask build allows manually overriding the
 * rewards API environment (true for non-RC / non-production builds).
 */
export type RewardsControllerCanChangeRewardsEnvUrlAction = {
  type: `RewardsController:canChangeRewardsEnvUrl`;
  handler: RewardsController['canChangeRewardsEnvUrl'];
};

/**
 * Returns the default rewards API base URL for the current MetaMask
 * environment, ignoring any manual override.
 */
export type RewardsControllerGetDefaultRewardsEnvUrlAction = {
  type: `RewardsController:getDefaultRewardsEnvUrl`;
  handler: RewardsController['getDefaultRewardsEnvUrl'];
};

/**
 * Switches the active rewards API URL, persists the choice, and
 * resets all cached state so the next fetches target the new environment.
 *
 * No-ops on production builds where the environment URL cannot be changed.
 */
export type RewardsControllerSetRewardsEnvUrlAction = {
  type: `RewardsController:setRewardsEnvUrl`;
  handler: RewardsController['setRewardsEnvUrl'];
};

/**
 * Get the actual subscription ID for a given CAIP account ID
 *
 * @param account - The CAIP account ID to check
 * @returns The subscription ID or null if not found
 */
export type RewardsControllerGetActualSubscriptionIdAction = {
  type: `RewardsController:getActualSubscriptionId`;
  handler: RewardsController['getActualSubscriptionId'];
};

/**
 * Get the first subscription ID from the subscriptions map
 *
 * @returns The first subscription ID or null if no subscriptions exist
 */
export type RewardsControllerGetFirstSubscriptionIdAction = {
  type: `RewardsController:getFirstSubscriptionId`;
  handler: RewardsController['getFirstSubscriptionId'];
};

/**
 * Sign a message for rewards authentication
 */
export type RewardsControllerSignRewardsMessageAction = {
  type: `RewardsController:signRewardsMessage`;
  handler: RewardsController['signRewardsMessage'];
};

/**
 * Set the active account from a candidate account
 */
export type RewardsControllerSetActiveAccountFromCandidateAction = {
  type: `RewardsController:setActiveAccountFromCandidate`;
  handler: RewardsController['setActiveAccountFromCandidate'];
};

/**
 * Handle authentication triggers (account changes, keyring unlock)
 */
export type RewardsControllerHandleAuthenticationTriggerAction = {
  type: `RewardsController:handleAuthenticationTrigger`;
  handler: RewardsController['handleAuthenticationTrigger'];
};

/**
 * Check if silent authentication should be skipped
 */
export type RewardsControllerShouldSkipSilentAuthAction = {
  type: `RewardsController:shouldSkipSilentAuth`;
  handler: RewardsController['shouldSkipSilentAuth'];
};

/**
 * Check if an internal account supports opt-in for rewards
 *
 * @param account - The internal account to check
 * @returns boolean - True if the account supports opt-in, false otherwise
 */
export type RewardsControllerIsOptInSupportedAction = {
  type: `RewardsController:isOptInSupported`;
  handler: RewardsController['isOptInSupported'];
};

export type RewardsControllerConvertInternalAccountToCaipAccountIdAction = {
  type: `RewardsController:convertInternalAccountToCaipAccountId`;
  handler: RewardsController['convertInternalAccountToCaipAccountId'];
};

/**
 * Perform silent authentication for the given address
 */
export type RewardsControllerPerformSilentAuthAction = {
  type: `RewardsController:performSilentAuth`;
  handler: RewardsController['performSilentAuth'];
};

/**
 * Check if the given account (caip-10 format) has opted in to rewards
 *
 * @param account - The account address in CAIP-10 format
 * @returns Promise<boolean> - True if the account has opted in, false otherwise
 */
export type RewardsControllerGetHasAccountOptedInAction = {
  type: `RewardsController:getHasAccountOptedIn`;
  handler: RewardsController['getHasAccountOptedIn'];
};

export type RewardsControllerCheckOptInStatusAgainstCacheAction = {
  type: `RewardsController:checkOptInStatusAgainstCache`;
  handler: RewardsController['checkOptInStatusAgainstCache'];
};

/**
 * Get opt-in status for multiple addresses with feature flag check
 *
 * @param params - The request parameters containing addresses
 * @returns Promise<OptInStatusDto> - The opt-in status response
 */
export type RewardsControllerGetOptInStatusAction = {
  type: `RewardsController:getOptInStatus`;
  handler: RewardsController['getOptInStatus'];
};

/**
 * Get perps fee discount for an account.
 *
 * Calls the authenticated `/vip/fees` endpoint (bypassing the local
 * `subscription.features.vip.enabled` flag — the backend is the source of
 * truth) and converts the absolute VIP builder fee into a discount fraction
 * relative to `baseFeeBips`. Responses are cached per-subscription for
 * `VIP_PERPS_FEES_CACHE_THRESHOLD_MS`. When the backend returns a valid fee
 * response the controller also flips the subscription's
 * `features.vip.enabled` flag to `true` so the rest of the app reflects the
 * user's VIP status.
 *
 * @param account - The account address in CAIP-10 format
 * @param baseFeeBips - The perps MetaMask builder base fee in basis points
 * that the caller would apply absent any discount. Used to convert the VIP
 * absolute fee into a discount fraction (caller owns the source of truth
 * for the base fee; the controller is a pure transformer).
 * @returns Promise<number | null> — Discount in basis points (0-10000), or
 * null when the discount is currently unknowable (rewards disabled, no
 * subscription, unhydrated cache, fetch error). Callers should treat null
 * as "no discount available yet" and retry next call. A literal 0 means
 * "no discount applies" (tier-0 / non-VIP response, out-of-range bips).
 */
export type RewardsControllerGetPerpsDiscountForAccountAction = {
  type: `RewardsController:getPerpsDiscountForAccount`;
  handler: RewardsController['getPerpsDiscountForAccount'];
};

/**
 * Get points events for a given season
 *
 * @param params - The request parameters
 * @returns Promise<PaginatedPointsEventsDto> - The points events data
 */
export type RewardsControllerGetPointsEventsAction = {
  type: `RewardsController:getPointsEvents`;
  handler: RewardsController['getPointsEvents'];
};

export type RewardsControllerGetPointsEventsIfChangedAction = {
  type: `RewardsController:getPointsEventsIfChanged`;
  handler: RewardsController['getPointsEventsIfChanged'];
};

/**
 * Get points events last updated for a given season
 *
 * @param params - The request parameters
 * @returns Promise<Date | null> - The points events last updated date
 */
export type RewardsControllerGetPointsEventsLastUpdatedAction = {
  type: `RewardsController:getPointsEventsLastUpdated`;
  handler: RewardsController['getPointsEventsLastUpdated'];
};

/**
 * Check if a new points events have been added since the last fetch
 *
 * @param params - The request parameters
 * @returns Promise<boolean> - True if a new points events have been added since the last fetch, false otherwise
 */
export type RewardsControllerHasPointsEventsChangedAction = {
  type: `RewardsController:hasPointsEventsChanged`;
  handler: RewardsController['hasPointsEventsChanged'];
};

/**
 * Estimate points for a given activity
 *
 * @param request - The estimate points request containing activity type and context
 * @returns Promise<EstimatedPointsDto> - The estimated points and bonus information
 * @note For PERPS activities, perpsContext can be a single position or an array for batch estimation.
 * When an array is provided, returns aggregated points (sum) and average bonus.
 */
export type RewardsControllerEstimatePointsAction = {
  type: `RewardsController:estimatePoints`;
  handler: RewardsController['estimatePoints'];
};

/**
 * Add a successful points estimate to the history for Customer Support diagnostics.
 * Maintains a bounded history of the last N estimates.
 *
 * @param request - The estimate request containing activity details
 * @param response - The estimated points response
 */
export type RewardsControllerAddPointsEstimateToHistoryAction = {
  type: `RewardsController:addPointsEstimateToHistory`;
  handler: RewardsController['addPointsEstimateToHistory'];
};

/**
 * Check if the rewards feature is enabled
 *
 * @returns boolean - True if rewards feature is enabled, false otherwise
 */
export type RewardsControllerIsRewardsFeatureEnabledAction = {
  type: `RewardsController:isRewardsFeatureEnabled`;
  handler: RewardsController['isRewardsFeatureEnabled'];
};

/**
 * Check if there is an active season.
 * Temporarily hardcoded to false while no season is configured. Callers
 * gate season-scoped flows (points estimates, rewards rows, dashboard
 * fetches) off this; the perps VIP fee discount is independent and
 * unaffected.
 */
export type RewardsControllerHasActiveSeasonAction = {
  type: `RewardsController:hasActiveSeason`;
  handler: RewardsController['hasActiveSeason'];
};

/**
 * Get season metadata with caching. This fetches and caches the season metadata
 * including id, name, dates, tiers, and activity types.
 *
 * @param type - The type of season to get
 * @returns Promise<SeasonDtoState> - The season metadata
 */
export type RewardsControllerGetSeasonMetadataAction = {
  type: `RewardsController:getSeasonMetadata`;
  handler: RewardsController['getSeasonMetadata'];
};

/**
 * Get season status with caching
 *
 * @param seasonId - The ID of the season to get status for
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<SeasonStatusState> - The season status data
 */
export type RewardsControllerGetSeasonStatusAction = {
  type: `RewardsController:getSeasonStatus`;
  handler: RewardsController['getSeasonStatus'];
};

/**
 * Invalidate local state for a subscription and its linked rewards accounts.
 *
 * Removes the subscription metadata entry, resets any linked rewards account
 * state to opted-out, resets the active rewards account when it belongs to
 * the subscription, and removes the stored session token. This intentionally
 * does not clear rewards API caches such as vipDashboard; pair it with
 * invalidateSubscriptionCache when cached data must be removed.
 *
 * @param subscriptionId - The subscription ID to invalidate
 */
export type RewardsControllerInvalidateSubscriptionAndAccountsAction = {
  type: `RewardsController:invalidateSubscriptionAndAccounts`;
  handler: RewardsController['invalidateSubscriptionAndAccounts'];
};

/**
 * Get referral details with caching
 *
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<SubscriptionReferralDetailState | null> - The referral details data
 */
export type RewardsControllerGetReferralDetailsAction = {
  type: `RewardsController:getReferralDetails`;
  handler: RewardsController['getReferralDetails'];
};

/**
 * Perform the complete opt-in process for rewards
 *
 * @param accounts - Array of internal accounts to opt in
 * @param referralCode - Optional referral code
 */
export type RewardsControllerOptInAction = {
  type: `RewardsController:optIn`;
  handler: RewardsController['optIn'];
};

/**
 * Reset rewards account state and clear all access tokens
 */
export type RewardsControllerResetAllAction = {
  type: `RewardsController:resetAll`;
  handler: RewardsController['resetAll'];
};

/**
 * Logout user from rewards and clear associated data
 *
 * @param subscriptionId - Optional subscription ID to logout from
 */
export type RewardsControllerLogoutAction = {
  type: `RewardsController:logout`;
  handler: RewardsController['logout'];
};

/**
 * Get geo rewards metadata including location and support status
 *
 * @returns Promise<GeoRewardsMetadata> - The geo rewards metadata
 */
export type RewardsControllerGetGeoRewardsMetadataAction = {
  type: `RewardsController:getGeoRewardsMetadata`;
  handler: RewardsController['getGeoRewardsMetadata'];
};

/**
 * Validate a referral code
 *
 * @param code - The referral code to validate
 * @returns Promise<boolean> - True if the code is valid, false otherwise
 */
export type RewardsControllerValidateReferralCodeAction = {
  type: `RewardsController:validateReferralCode`;
  handler: RewardsController['validateReferralCode'];
};

/**
 * Validate a bonus code
 *
 * @param code - The bonus code to validate
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<boolean> - True if the code is valid, false otherwise
 */
export type RewardsControllerValidateBonusCodeAction = {
  type: `RewardsController:validateBonusCode`;
  handler: RewardsController['validateBonusCode'];
};

/**
 * Get candidate subscription ID with fallback logic
 *
 * @returns Promise<string | null> - The subscription ID or null if none found
 */
export type RewardsControllerGetCandidateSubscriptionIdAction = {
  type: `RewardsController:getCandidateSubscriptionId`;
  handler: RewardsController['getCandidateSubscriptionId'];
};

/**
 * Link an account to a subscription via mobile join
 *
 * @param account - The account to link to the subscription
 * @returns Promise<boolean> - The updated subscription information
 */
export type RewardsControllerLinkAccountToSubscriptionCandidateAction = {
  type: `RewardsController:linkAccountToSubscriptionCandidate`;
  handler: RewardsController['linkAccountToSubscriptionCandidate'];
};

/**
 * Link multiple accounts to a subscription candidate
 *
 * @param accounts - Array of accounts to link to the subscription
 */
export type RewardsControllerLinkAccountsToSubscriptionCandidateAction = {
  type: `RewardsController:linkAccountsToSubscriptionCandidate`;
  handler: RewardsController['linkAccountsToSubscriptionCandidate'];
};

/**
 * Opt out of the rewards program, deleting the subscription and all associated data
 *
 * @returns Promise<boolean> - True if opt-out was successful, false otherwise
 */
export type RewardsControllerOptOutAction = {
  type: `RewardsController:optOut`;
  handler: RewardsController['optOut'];
};

/**
 * Get active points boosts for the current season
 * Get active points boosts for the current season with caching
 *
 * @param seasonId - The season ID to get points boosts for
 * @param subscriptionId - The subscription ID to get points boosts for
 * @returns Promise<PointsBoostDto[]> - The active points boosts
 */
export type RewardsControllerGetActivePointsBoostsAction = {
  type: `RewardsController:getActivePointsBoosts`;
  handler: RewardsController['getActivePointsBoosts'];
};

/**
 * Get unlocked rewards with caching
 *
 * @param seasonId - The season ID
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<RewardDto[]> - The unlocked rewards data
 */
export type RewardsControllerGetUnlockedRewardsAction = {
  type: `RewardsController:getUnlockedRewards`;
  handler: RewardsController['getUnlockedRewards'];
};

/**
 * Get CAIP-10 encoded accounts linked to a subscription with caching
 *
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<string[]> - Array of CAIP-10 account strings
 */
export type RewardsControllerGetOffDeviceSubscriptionAccountsAction = {
  type: `RewardsController:getOffDeviceSubscriptionAccounts`;
  handler: RewardsController['getOffDeviceSubscriptionAccounts'];
};

/**
 * Get all available campaigns with caching
 *
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<CampaignDto[]> - The list of campaigns
 */
export type RewardsControllerGetCampaignsAction = {
  type: `RewardsController:getCampaigns`;
  handler: RewardsController['getCampaigns'];
};

/**
 * Opt a subscription into a campaign.
 *
 * @param campaignId - The campaign ID to opt into.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The participant status after opting in.
 */
export type RewardsControllerOptInToCampaignAction = {
  type: `RewardsController:optInToCampaign`;
  handler: RewardsController['optInToCampaign'];
};

/**
 * Get the campaign participant status, cached for 5 minutes.
 *
 * @param campaignId - The campaign ID to check status for.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The participant status.
 */
export type RewardsControllerGetCampaignParticipantStatusAction = {
  type: `RewardsController:getCampaignParticipantStatus`;
  handler: RewardsController['getCampaignParticipantStatus'];
};

/**
 * Get the campaign leaderboard showing top 20 participants per tier.
 * This is a public endpoint - no authentication required.
 * Results are cached for 5 minutes.
 *
 * @param campaignId - The campaign ID to get leaderboard for.
 * @returns The leaderboard data grouped by tier.
 */
export type RewardsControllerGetOndoCampaignLeaderboardAction = {
  type: `RewardsController:getOndoCampaignLeaderboard`;
  handler: RewardsController['getOndoCampaignLeaderboard'];
};

/**
 * Get campaign-wide total deposits.
 * This is a public endpoint - no authentication required.
 * Results are cached for 5 minutes.
 *
 * @param campaignId - The campaign ID to get deposits for.
 * @returns The total USD deposited across all participants.
 */
export type RewardsControllerGetOndoCampaignDepositsAction = {
  type: `RewardsController:getOndoCampaignDeposits`;
  handler: RewardsController['getOndoCampaignDeposits'];
};

/**
 * Fetch the participant outcome for the current user in a completed Perps Trading campaign.
 * Results are cached for 10 minutes using a private in-memory Map.
 *
 * @param campaignId - The campaign ID.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The participant outcome DTO, or null if unavailable.
 */
export type RewardsControllerGetPerpsTradingCampaignParticipantOutcomeAction = {
  type: `RewardsController:getPerpsTradingCampaignParticipantOutcome`;
  handler: RewardsController['getPerpsTradingCampaignParticipantOutcome'];
};

/**
 * Get the current user's position on the campaign leaderboard.
 * This is an authenticated endpoint.
 * Always fetches fresh from the API so the user's rank stays in sync with
 * their latest trades; the result is mirrored to
 * `state.ondoCampaignLeaderboardPositions` so selectors can read the latest
 * snapshot.
 *
 * @param campaignId - The campaign ID to get position for.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The user's leaderboard position, or null if not found.
 */
export type RewardsControllerGetOndoCampaignLeaderboardPositionAction = {
  type: `RewardsController:getOndoCampaignLeaderboardPosition`;
  handler: RewardsController['getOndoCampaignLeaderboardPosition'];
};

export type RewardsControllerGetOndoCampaignParticipantOutcomeAction = {
  type: `RewardsController:getOndoCampaignParticipantOutcome`;
  handler: RewardsController['getOndoCampaignParticipantOutcome'];
};

/**
 * Get the current user's Ondo GM portfolio for a campaign.
 * This is an authenticated endpoint.
 * Always fetches fresh from the API; the result is mirrored to
 * `state.ondoCampaignPortfolio[subscriptionId:campaignId]` as
 * {@link OndoGmPortfolioState} so selectors can read the latest snapshot.
 * Null API responses are not written to the cache.
 *
 * @param campaignId - The campaign ID to get portfolio for.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The portfolio, or null if not found.
 */
export type RewardsControllerGetOndoCampaignPortfolioPositionAction = {
  type: `RewardsController:getOndoCampaignPortfolioPosition`;
  handler: RewardsController['getOndoCampaignPortfolioPosition'];
};

/**
 * Get paginated activity for an Ondo GM campaign.
 * Always fetches fresh from the API; the first-page result is mirrored to
 * `state.ondoCampaignActivity` so selectors can read the latest snapshot.
 * Subsequent pages (cursor provided) are fetched directly without going
 * through the cache. When `forceFresh` is true a last-updated check avoids
 * redundant fetches if the server data hasn't changed.
 *
 * @param params - Campaign ID, subscription ID, pagination cursor, and optional forceFresh flag.
 * @returns Paginated activity entries.
 */
export type RewardsControllerGetOndoCampaignActivityAction = {
  type: `RewardsController:getOndoCampaignActivity`;
  handler: RewardsController['getOndoCampaignActivity'];
};

/**
 * Fetch the first page of activity only if the server data has changed
 * since the last cached entry. Falls back to cached data when unchanged.
 */
export type RewardsControllerGetActivityIfChangedAction = {
  type: `RewardsController:getActivityIfChanged`;
  handler: RewardsController['getActivityIfChanged'];
};

/**
 * Get the last-updated timestamp for Ondo GM campaign activity.
 *
 * @param campaignId - The campaign ID.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The last-updated date, or null if no activity exists.
 */
export type RewardsControllerGetActivityLastUpdatedAction = {
  type: `RewardsController:getActivityLastUpdated`;
  handler: RewardsController['getActivityLastUpdated'];
};

/**
 * Check if campaign activity has changed since the last fetch.
 * Compares the server's last-updated timestamp against the most recent
 * cached entry's timestamp.
 *
 * @returns true if fresh data should be fetched.
 */
export type RewardsControllerHasActivityChangedAction = {
  type: `RewardsController:hasActivityChanged`;
  handler: RewardsController['hasActivityChanged'];
};

/**
 * Claim a reward
 *
 * @param rewardId - The reward ID
 * @param dto - The claim reward request body
 * @param subscriptionId - The subscription ID for authentication
 */
export type RewardsControllerClaimRewardAction = {
  type: `RewardsController:claimReward`;
  handler: RewardsController['claimReward'];
};

/**
 * Get Season 1 Linea token reward for the subscription.
 *
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The Linea token reward DTO or null if not found.
 */
export type RewardsControllerGetSeasonOneLineaRewardTokensAction = {
  type: `RewardsController:getSeasonOneLineaRewardTokens`;
  handler: RewardsController['getSeasonOneLineaRewardTokens'];
};

/**
 * Get benefits details with caching
 *
 * @param subscriptionId - The subscription ID for authentication
 * @param limit - The maximum number of items requested
 * @returns Promise<SubscriptionBenefitsState> - The benefits data
 */
export type RewardsControllerGetBenefitsAction = {
  type: `RewardsController:getBenefits`;
  handler: RewardsController['getBenefits'];
};

/**
 * Get the VIP dashboard with caching.
 *
 * @param subscriptionId - The subscription ID for authentication
 * @returns Promise<VipDashboardState | null> - The dashboard data, or null when the user is not VIP
 */
export type RewardsControllerGetVIPDashboardAction = {
  type: `RewardsController:getVIPDashboard`;
  handler: RewardsController['getVIPDashboard'];
};

/**
 * Post a benefit impression with caching to prevent duplicate impressions within a short time frame
 *
 * @param subscriptionId - The subscription ID for authentication
 * @param benefitId - The specific benefit ID that was impressed
 * @param benefitType - The type of the benefit that was impressed
 * @returns Promise<SubscriptionBenefitsState> - The benefits data
 */
export type RewardsControllerPostBenefitImpressionAction = {
  type: `RewardsController:postBenefitImpression`;
  handler: RewardsController['postBenefitImpression'];
};

/**
 * Apply a referral code to an existing subscription.
 *
 * @param referralCode - The referral code to apply.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns Promise that resolves when the referral code is applied successfully.
 * @throws Error with the error message from the API response.
 */
export type RewardsControllerApplyReferralCodeAction = {
  type: `RewardsController:applyReferralCode`;
  handler: RewardsController['applyReferralCode'];
};

/**
 * Apply a bonus code to a subscription.
 *
 * @param bonusCode - The bonus code to apply.
 * @param subscriptionId - The subscription ID to apply the bonus code to.
 * @returns Promise that resolves when the bonus code is applied successfully.
 * @throws Error with the error message from the API response.
 */
export type RewardsControllerApplyBonusCodeAction = {
  type: `RewardsController:applyBonusCode`;
  handler: RewardsController['applyBonusCode'];
};

/**
 * Fetch the minimum client version requirements from the public API.
 * Cached for 30 minutes using controller state, matching other endpoint caches.
 * This is a public (unauthenticated) endpoint that does not require
 * the rewards feature to be enabled.
 */
export type RewardsControllerGetClientVersionRequirementsAction = {
  type: `RewardsController:getClientVersionRequirements`;
  handler: RewardsController['getClientVersionRequirements'];
};

/**
 * Invalidate referral details cache for a subscription
 *
 * @param subscriptionId - The subscription ID to invalidate cache for
 */
export type RewardsControllerInvalidateReferralDetailsCacheAction = {
  type: `RewardsController:invalidateReferralDetailsCache`;
  handler: RewardsController['invalidateReferralDetailsCache'];
};

/**
 * Invalidate cached data for a subscription
 *
 * Clears cached rewards API data only. This does not alter linked account
 * auth state, subscription metadata, or stored session tokens; pair it with
 * invalidateSubscriptionAndAccounts when auth/account state must be reset.
 *
 * @param options - Cache invalidation scope
 * @param options.subscriptionId - The subscription ID to invalidate cache for
 * @param options.seasonId - Optional season ID to limit invalidation to season-scoped cache entries
 * @param options.campaignId - Optional campaign ID to limit invalidation to campaign-scoped cache entries
 */
export type RewardsControllerInvalidateSubscriptionCacheAction = {
  type: `RewardsController:invalidateSubscriptionCache`;
  handler: RewardsController['invalidateSubscriptionCache'];
};

/**
 * Get the perps trading campaign leaderboard.
 * This is a public endpoint - no authentication required.
 * Results are cached for 5 minutes.
 *
 * @param campaignId - The campaign ID to get leaderboard for.
 * @returns The leaderboard entries and metadata.
 */
export type RewardsControllerGetPerpsTradingCampaignLeaderboardAction = {
  type: `RewardsController:getPerpsTradingCampaignLeaderboard`;
  handler: RewardsController['getPerpsTradingCampaignLeaderboard'];
};

/**
 * Get the current user's position on the perps trading campaign leaderboard.
 * This is an authenticated endpoint.
 * Always fetches fresh from the API so the user's rank stays in sync with
 * their latest trades; the result is mirrored to
 * `state.perpsTradingCampaignLeaderboardPositions` so selectors can read the
 * latest snapshot.
 *
 * @param campaignId - The campaign ID to get position for.
 * @param subscriptionId - The subscription ID for authentication.
 * @returns The user's leaderboard position, or null if not found.
 */
export type RewardsControllerGetPerpsTradingCampaignLeaderboardPositionAction =
  {
    type: `RewardsController:getPerpsTradingCampaignLeaderboardPosition`;
    handler: RewardsController['getPerpsTradingCampaignLeaderboardPosition'];
  };

/**
 * Get the perps trading campaign aggregate volume (public stats).
 * This is a public endpoint - no authentication required.
 * Results are cached for 1 minute.
 *
 * @param campaignId - The campaign ID to get volume for.
 * @returns Current aggregate notional volume for the campaign.
 */
export type RewardsControllerGetPerpsTradingCampaignVolumeAction = {
  type: `RewardsController:getPerpsTradingCampaignVolume`;
  handler: RewardsController['getPerpsTradingCampaignVolume'];
};

/**
 * Union of all RewardsController action types.
 */
export type RewardsControllerMethodActions =
  | RewardsControllerCalculateTierStatusAction
  | RewardsControllerConvertToSeasonStatusDtoAction
  | RewardsControllerResetStateAction
  | RewardsControllerGetRewardsEnvUrlAction
  | RewardsControllerCanChangeRewardsEnvUrlAction
  | RewardsControllerGetDefaultRewardsEnvUrlAction
  | RewardsControllerSetRewardsEnvUrlAction
  | RewardsControllerGetActualSubscriptionIdAction
  | RewardsControllerGetFirstSubscriptionIdAction
  | RewardsControllerSignRewardsMessageAction
  | RewardsControllerSetActiveAccountFromCandidateAction
  | RewardsControllerHandleAuthenticationTriggerAction
  | RewardsControllerShouldSkipSilentAuthAction
  | RewardsControllerIsOptInSupportedAction
  | RewardsControllerConvertInternalAccountToCaipAccountIdAction
  | RewardsControllerPerformSilentAuthAction
  | RewardsControllerGetHasAccountOptedInAction
  | RewardsControllerCheckOptInStatusAgainstCacheAction
  | RewardsControllerGetOptInStatusAction
  | RewardsControllerGetPerpsDiscountForAccountAction
  | RewardsControllerGetPointsEventsAction
  | RewardsControllerGetPointsEventsIfChangedAction
  | RewardsControllerGetPointsEventsLastUpdatedAction
  | RewardsControllerHasPointsEventsChangedAction
  | RewardsControllerEstimatePointsAction
  | RewardsControllerAddPointsEstimateToHistoryAction
  | RewardsControllerIsRewardsFeatureEnabledAction
  | RewardsControllerHasActiveSeasonAction
  | RewardsControllerGetSeasonMetadataAction
  | RewardsControllerGetSeasonStatusAction
  | RewardsControllerInvalidateSubscriptionAndAccountsAction
  | RewardsControllerGetReferralDetailsAction
  | RewardsControllerOptInAction
  | RewardsControllerResetAllAction
  | RewardsControllerLogoutAction
  | RewardsControllerGetGeoRewardsMetadataAction
  | RewardsControllerValidateReferralCodeAction
  | RewardsControllerValidateBonusCodeAction
  | RewardsControllerGetCandidateSubscriptionIdAction
  | RewardsControllerLinkAccountToSubscriptionCandidateAction
  | RewardsControllerLinkAccountsToSubscriptionCandidateAction
  | RewardsControllerOptOutAction
  | RewardsControllerGetActivePointsBoostsAction
  | RewardsControllerGetUnlockedRewardsAction
  | RewardsControllerGetOffDeviceSubscriptionAccountsAction
  | RewardsControllerGetCampaignsAction
  | RewardsControllerOptInToCampaignAction
  | RewardsControllerGetCampaignParticipantStatusAction
  | RewardsControllerGetOndoCampaignLeaderboardAction
  | RewardsControllerGetOndoCampaignDepositsAction
  | RewardsControllerGetPerpsTradingCampaignParticipantOutcomeAction
  | RewardsControllerGetOndoCampaignLeaderboardPositionAction
  | RewardsControllerGetOndoCampaignParticipantOutcomeAction
  | RewardsControllerGetOndoCampaignPortfolioPositionAction
  | RewardsControllerGetOndoCampaignActivityAction
  | RewardsControllerGetActivityIfChangedAction
  | RewardsControllerGetActivityLastUpdatedAction
  | RewardsControllerHasActivityChangedAction
  | RewardsControllerClaimRewardAction
  | RewardsControllerGetSeasonOneLineaRewardTokensAction
  | RewardsControllerGetBenefitsAction
  | RewardsControllerGetVIPDashboardAction
  | RewardsControllerPostBenefitImpressionAction
  | RewardsControllerApplyReferralCodeAction
  | RewardsControllerApplyBonusCodeAction
  | RewardsControllerGetClientVersionRequirementsAction
  | RewardsControllerInvalidateReferralDetailsCacheAction
  | RewardsControllerInvalidateSubscriptionCacheAction
  | RewardsControllerGetPerpsTradingCampaignLeaderboardAction
  | RewardsControllerGetPerpsTradingCampaignLeaderboardPositionAction
  | RewardsControllerGetPerpsTradingCampaignVolumeAction;
