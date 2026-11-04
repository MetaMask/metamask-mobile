/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { RewardsMoneyController } from './RewardsMoneyController';

export type RewardsMoneyControllerIsRewardsMoneyFeatureEnabledAction = {
  type: `RewardsMoneyController:isRewardsMoneyFeatureEnabled`;
  handler: RewardsMoneyController['isRewardsMoneyFeatureEnabled'];
};

export type RewardsMoneyControllerGetRewardsMoneyEnvUrlAction = {
  type: `RewardsMoneyController:getRewardsMoneyEnvUrl`;
  handler: RewardsMoneyController['getRewardsMoneyEnvUrl'];
};

export type RewardsMoneyControllerCanChangeRewardsMoneyEnvUrlAction = {
  type: `RewardsMoneyController:canChangeRewardsMoneyEnvUrl`;
  handler: RewardsMoneyController['canChangeRewardsMoneyEnvUrl'];
};

export type RewardsMoneyControllerGetDefaultRewardsMoneyEnvUrlAction = {
  type: `RewardsMoneyController:getDefaultRewardsMoneyEnvUrl`;
  handler: RewardsMoneyController['getDefaultRewardsMoneyEnvUrl'];
};

export type RewardsMoneyControllerSetRewardsMoneyEnvUrlAction = {
  type: `RewardsMoneyController:setRewardsMoneyEnvUrl`;
  handler: RewardsMoneyController['setRewardsMoneyEnvUrl'];
};

export type RewardsMoneyControllerGetReferralMeAction = {
  type: `RewardsMoneyController:getReferralMe`;
  handler: RewardsMoneyController['getReferralMe'];
};

export type RewardsMoneyControllerGetReferralFunnelAction = {
  type: `RewardsMoneyController:getReferralFunnel`;
  handler: RewardsMoneyController['getReferralFunnel'];
};

export type RewardsMoneyControllerGetReferralCodesAction = {
  type: `RewardsMoneyController:getReferralCodes`;
  handler: RewardsMoneyController['getReferralCodes'];
};

export type RewardsMoneyControllerValidateReferralCodeAction = {
  type: `RewardsMoneyController:validateReferralCode`;
  handler: RewardsMoneyController['validateReferralCode'];
};

/**
 * Rebate a swaps confirmation screen should show. The bridge quote decides
 * fee-token eligibility. Not cached: the rate has to disappear the moment
 * an operator ends the window, and a different quote can name a different
 * fee token.
 *
 * Pass the `quote` of the bridge `QuoteResponse`, not the response. Only
 * its `feeData.metabridge` is sent.
 *
 * A refusal rejects with `RewardsMoneyRebateQuoteError`, a `401` with
 * `RewardsMoneyAuthorizationError`. A timeout or a network failure rejects
 * with a plain `Error`. A `401` is not retried.
 *
 * A `503` or `429` whose `Retry-After` is at most 5 seconds is retried once
 * inside the data service, after that delay plus up to a second of jitter.
 * The promise includes that wait. Callers must not retry again. A `429`
 * (`RATE_LIMITED`) shares the profile read budget, 60 requests per 30
 * seconds, with the Earnings reads. A `503` (`UNAVAILABLE`) means the
 * server is unavailable, whether the body reason is `SERVER_BUSY` or
 * `JWKS_UNAVAILABLE`.
 *
 * @param quote - The bridge quote the confirmation screen holds.
 * @returns The rebate to show; `eligible: false` means no rebate row.
 */
export type RewardsMoneyControllerGetSwapsRebateQuoteAction = {
  type: `RewardsMoneyController:getSwapsRebateQuote`;
  handler: RewardsMoneyController['getSwapsRebateQuote'];
};

/**
 * Rebate a perps confirmation screen should show. `trade` is optional and
 * the server drops it today; the answer does not depend on it. A trade the
 * server would refuse (see {@link PerpsRebateTrade}) is left out rather
 * than sent, so it cannot turn the quote into a `400`.
 *
 * A refusal rejects with `RewardsMoneyRebateQuoteError`, a `401` with
 * `RewardsMoneyAuthorizationError`. A timeout or a network failure rejects
 * with a plain `Error`. A `401` is not retried.
 *
 * A `503` or `429` whose `Retry-After` is at most 5 seconds is retried once
 * inside the data service, after that delay plus up to a second of jitter.
 * The promise includes that wait. Callers must not retry again. A `429`
 * (`RATE_LIMITED`) shares the profile read budget, 60 requests per 30
 * seconds, with the Earnings reads. A `503` (`UNAVAILABLE`) means the
 * server is unavailable, whether the body reason is `SERVER_BUSY` or
 * `JWKS_UNAVAILABLE`.
 *
 * @param trade - What the user is about to trade, when known.
 * @returns The rebate to show; `eligible: false` means no rebate row.
 */
export type RewardsMoneyControllerGetPerpsRebateQuoteAction = {
  type: `RewardsMoneyController:getPerpsRebateQuote`;
  handler: RewardsMoneyController['getPerpsRebateQuote'];
};

/**
 * Enrols the session profile under a referrer's code. Drops that profile's
 * cached referral me after the write succeeds, so a later read cannot
 * return the pre-registration roles for the rest of the cache window. A
 * read already in flight cannot write its payload back. The new role is
 * read through `getReferralMe({ forceFresh: true })`.
 */
export type RewardsMoneyControllerRegisterRefereeAction = {
  type: `RewardsMoneyController:registerReferee`;
  handler: RewardsMoneyController['registerReferee'];
};

export type RewardsMoneyControllerGetEarningsSummaryAction = {
  type: `RewardsMoneyController:getEarningsSummary`;
  handler: RewardsMoneyController['getEarningsSummary'];
};

export type RewardsMoneyControllerGetEarningsLedgerAction = {
  type: `RewardsMoneyController:getEarningsLedger`;
  handler: RewardsMoneyController['getEarningsLedger'];
};

export type RewardsMoneyControllerGetClaimHistoryAction = {
  type: `RewardsMoneyController:getClaimHistory`;
  handler: RewardsMoneyController['getClaimHistory'];
};

export type RewardsMoneyControllerGetCommissionsAction = {
  type: `RewardsMoneyController:getCommissions`;
  handler: RewardsMoneyController['getCommissions'];
};

export type RewardsMoneyControllerInitiateClaimAction = {
  type: `RewardsMoneyController:initiateClaim`;
  handler: RewardsMoneyController['initiateClaim'];
};

/**
 * `GET /tax/me`, cached for five minutes per profile.
 *
 * `forceFresh` does not join a read already running, and its result wins
 * if that older read lands last. A tax POST drops the entry, so the next
 * read cannot return the determination that POST replaced.
 */
export type RewardsMoneyControllerGetTaxMeAction = {
  type: `RewardsMoneyController:getTaxMe`;
  handler: RewardsMoneyController['getTaxMe'];
};

/**
 * The form-success snapshot for this profile, or null when none is stored.
 * Claim force-reads `tax/me` while one is set.
 */
export type RewardsMoneyControllerGetTaxFormSubmittedAction = {
  type: `RewardsMoneyController:getTaxFormSubmitted`;
  handler: RewardsMoneyController['getTaxFormSubmitted'];
};

/**
 * Remember a form submission, or clear it when `snapshot` is null.
 * The caller decides which reads still count as "checking".
 */
export type RewardsMoneyControllerNoteTaxFormSubmittedAction = {
  type: `RewardsMoneyController:noteTaxFormSubmitted`;
  handler: RewardsMoneyController['noteTaxFormSubmitted'];
};

/**
export type RewardsMoneyControllerClearTaxFormSubmittedAction = {
  type: `RewardsMoneyController:clearTaxFormSubmitted`;
  handler: RewardsMoneyController['clearTaxFormSubmitted'];
};

export type RewardsMoneyControllerSubmitTaxAttestationAction = {
  type: `RewardsMoneyController:submitTaxAttestation`;
  handler: RewardsMoneyController['submitTaxAttestation'];
};

export type RewardsMoneyControllerSubmitTaxUsActivityAction = {
  type: `RewardsMoneyController:submitTaxUsActivity`;
  handler: RewardsMoneyController['submitTaxUsActivity'];
};

/**
 * Mints one form token. The token is returned to the caller and is not
 * written into controller state. Minting closes `can_change_answer`, so
 * the cached determination is dropped with the other tax writes.
 */
export type RewardsMoneyControllerMintTaxFormTokenAction = {
  type: `RewardsMoneyController:mintTaxFormToken`;
  handler: RewardsMoneyController['mintTaxFormToken'];
};

export type RewardsMoneyControllerGetClaimByIdAction = {
  type: `RewardsMoneyController:getClaimById`;
  handler: RewardsMoneyController['getClaimById'];
};

/**
 * Union of all RewardsMoneyController action types.
 */
export type RewardsMoneyControllerMethodActions =
  | RewardsMoneyControllerIsRewardsMoneyFeatureEnabledAction
  | RewardsMoneyControllerGetRewardsMoneyEnvUrlAction
  | RewardsMoneyControllerCanChangeRewardsMoneyEnvUrlAction
  | RewardsMoneyControllerGetDefaultRewardsMoneyEnvUrlAction
  | RewardsMoneyControllerSetRewardsMoneyEnvUrlAction
  | RewardsMoneyControllerGetReferralMeAction
  | RewardsMoneyControllerGetReferralFunnelAction
  | RewardsMoneyControllerGetReferralCodesAction
  | RewardsMoneyControllerValidateReferralCodeAction
  | RewardsMoneyControllerGetSwapsRebateQuoteAction
  | RewardsMoneyControllerGetPerpsRebateQuoteAction
  | RewardsMoneyControllerRegisterRefereeAction
  | RewardsMoneyControllerGetEarningsSummaryAction
  | RewardsMoneyControllerGetEarningsLedgerAction
  | RewardsMoneyControllerGetClaimHistoryAction
  | RewardsMoneyControllerGetCommissionsAction
  | RewardsMoneyControllerInitiateClaimAction
  | RewardsMoneyControllerGetTaxMeAction
  | RewardsMoneyControllerGetTaxFormSubmittedAction
  | RewardsMoneyControllerNoteTaxFormSubmittedAction
  | RewardsMoneyControllerClearTaxFormSubmittedAction
  | RewardsMoneyControllerSubmitTaxAttestationAction
  | RewardsMoneyControllerSubmitTaxUsActivityAction
  | RewardsMoneyControllerMintTaxFormTokenAction
  | RewardsMoneyControllerGetClaimByIdAction;
