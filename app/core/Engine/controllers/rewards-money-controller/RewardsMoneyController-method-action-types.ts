/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { RewardsMoneyController } from './RewardsMoneyController';

/**
 * Reset controller state to default.
 */
export type RewardsMoneyControllerResetStateAction = {
  type: `RewardsMoneyController:resetState`;
  handler: RewardsMoneyController['resetState'];
};

/**
 * Drop every cached bucket. Called on claim confirmation and on auth change.
 *
 * Every new bucket must be added here — the rewards controller's equivalent
 * leaks stale data across identity switches whenever one is forgotten, which
 * is exactly the failure this mirrors and avoids.
 */
export type RewardsMoneyControllerInvalidateRewardsMoneyCacheAction = {
  type: `RewardsMoneyController:invalidateRewardsMoneyCache`;
  handler: RewardsMoneyController['invalidateRewardsMoneyCache'];
};

/**
 * Record what a confirmed claim paid, so scoped summaries report the
 * post-claim figure until the server reflects it.
 *
 * @param params - The net amount paid and the origin types it covered.
 */
export type RewardsMoneyControllerRecordOptimisticClaimAction = {
  type: `RewardsMoneyController:recordOptimisticClaim`;
  handler: RewardsMoneyController['recordOptimisticClaim'];
};

/**
 * Tell open screens their earnings moved. Screens subscribe via
 * `useRewardsMoneyEvents` rather than polling.
 */
export type RewardsMoneyControllerNotifyEarningsUpdatedAction = {
  type: `RewardsMoneyController:notifyEarningsUpdated`;
  handler: RewardsMoneyController['notifyEarningsUpdated'];
};

/**
 * The bootstrap read. One call decides which screen renders, which rates it
 * shows, and whether there is a code to share.
 */
export type RewardsMoneyControllerGetReferralMeAction = {
  type: `RewardsMoneyController:getReferralMe`;
  handler: RewardsMoneyController['getReferralMe'];
};

/**
 * Totals and claimability for an origin-type scope. `claimable` is the exact
 * net a claim would pay, so the headline and the CTA cannot drift apart.
 */
export type RewardsMoneyControllerGetEarningsSummaryAction = {
  type: `RewardsMoneyController:getEarningsSummary`;
  handler: RewardsMoneyController['getEarningsSummary'];
};

/**
 * Page 1 goes through the cache and is the only page ever written to state.
 * A cursor page goes straight to the network — caching it would let a
 * multi-page merge flash and then shrink on the next refetch.
 */
export type RewardsMoneyControllerGetEarningsLedgerAction = {
  type: `RewardsMoneyController:getEarningsLedger`;
  handler: RewardsMoneyController['getEarningsLedger'];
};

/**
 * Opens a claim. Never cached: the voucher it returns is single-use and
 * expires in 60 seconds.
 */
export type RewardsMoneyControllerInitiateClaimAction = {
  type: `RewardsMoneyController:initiateClaim`;
  handler: RewardsMoneyController['initiateClaim'];
};

/**
 * Union of all RewardsMoneyController action types.
 */
export type RewardsMoneyControllerMethodActions =
  | RewardsMoneyControllerResetStateAction
  | RewardsMoneyControllerInvalidateRewardsMoneyCacheAction
  | RewardsMoneyControllerRecordOptimisticClaimAction
  | RewardsMoneyControllerNotifyEarningsUpdatedAction
  | RewardsMoneyControllerGetReferralMeAction
  | RewardsMoneyControllerGetEarningsSummaryAction
  | RewardsMoneyControllerGetEarningsLedgerAction
  | RewardsMoneyControllerInitiateClaimAction;
