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
 * Enrols the session profile under a referrer's code. Nothing is cached: the
 * referral role that changes as a result is read back through
 * `getReferralMe({ forceFresh: true })`.
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
  | RewardsMoneyControllerRegisterRefereeAction
  | RewardsMoneyControllerGetEarningsSummaryAction
  | RewardsMoneyControllerGetEarningsLedgerAction
  | RewardsMoneyControllerGetClaimHistoryAction
  | RewardsMoneyControllerGetCommissionsAction
  | RewardsMoneyControllerGetClaimByIdAction;
