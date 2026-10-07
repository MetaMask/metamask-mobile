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
 */
export type RewardsMoneyControllerGetSwapsRebateQuoteAction = {
  type: `RewardsMoneyController:getSwapsRebateQuote`;
  handler: RewardsMoneyController['getSwapsRebateQuote'];
};

/**
 * Rebate a perps confirmation screen should show. `trade` is optional and
 * the server drops it today; the answer does not depend on it.
 */
export type RewardsMoneyControllerGetPerpsRebateQuoteAction = {
  type: `RewardsMoneyController:getPerpsRebateQuote`;
  handler: RewardsMoneyController['getPerpsRebateQuote'];
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
  | RewardsMoneyControllerGetEarningsSummaryAction
  | RewardsMoneyControllerGetEarningsLedgerAction
  | RewardsMoneyControllerGetClaimHistoryAction
  | RewardsMoneyControllerGetCommissionsAction
  | RewardsMoneyControllerGetClaimByIdAction;
