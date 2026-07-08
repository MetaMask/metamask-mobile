import { strings } from '../../../../locales/i18n';
import type { ActivityKind } from '../../../util/activity-adapters';

/**
 * Fallback title resolvers for activity kinds whose title comes straight from an
 * i18n string (perps/predict domain rows). Consumed by `resolveFallbackTitle` in
 * `useActivityListItemRowContent`.
 */
export const ACTIVITY_FALLBACK_TITLE_RESOLVERS: Partial<
  Record<ActivityKind, () => string>
> = {
  predictionsAddFunds: () =>
    strings('transactions.activity_prediction_account_funded'),
  predictionsWithdrawFunds: () =>
    strings('transactions.activity_prediction_withdrawal'),
  predictionClaimWinnings: () => strings('predict.transactions.claim_title'),
  predictionCashedOut: () => strings('predict.transactions.sell_title'),
  // Design board copy: "Prediction placed" (not the legacy "Predicted").
  predictionPlaced: () => strings('transactions.activity_prediction_placed'),
  perpsAddFunds: () => strings('transactions.activity_perps_account_funded'),
  perpsWithdraw: () => strings('transactions.activity_perps_withdrawal'),
  perpsOpenLong: () => strings('transactions.activity_perps_open_long'),
  perpsCloseLong: () => strings('transactions.activity_perps_close_long'),
  perpsCloseLongLiquidated: () =>
    strings('transactions.activity_perps_close_long_liquidated'),
  perpsCloseLongStopLoss: () =>
    strings('transactions.activity_perps_close_long_stop_loss'),
  perpsOpenShort: () => strings('transactions.activity_perps_open_short'),
  perpsCloseShort: () => strings('transactions.activity_perps_close_short'),
  perpsCloseShortLiquidated: () =>
    strings('transactions.activity_perps_close_short_liquidated'),
  perpsCloseShortStopLoss: () =>
    strings('transactions.activity_perps_close_short_stop_loss'),
  perpsPaidFundingFees: () =>
    strings('transactions.activity_perps_paid_funding_fees'),
  perpsReceivedFundingFees: () =>
    strings('transactions.activity_perps_received_funding_fees'),
  perpsCloseShortTakeProfit: () =>
    strings('transactions.activity_perps_close_short_take_profit'),
  perpsCloseLongTakeProfit: () =>
    strings('transactions.activity_perps_close_long_take_profit'),
  marketShort: () => strings('transactions.activity_market_short'),
  stopMarketCloseShort: () =>
    strings('transactions.activity_stop_market_close_short'),
  marketCloseShort: () => strings('transactions.activity_market_close_short'),
  limitShort: () => strings('transactions.activity_limit_short'),
  limitCloseShort: () => strings('transactions.activity_limit_close_short'),
};

/**
 * Status verbs for single-token value activities (buy/sell/claim/stake/unstake/
 * deposit). Keyed by kind so the resolver is a lookup instead of a ternary chain.
 */
export const TOKEN_ACTION_LABELS: Record<
  'buy' | 'sell' | 'claim' | 'stake' | 'unstake' | 'deposit',
  { success: string; pending: string; failed: string }
> = {
  buy: { success: 'Bought', pending: 'Buying', failed: 'Buy failed' },
  sell: { success: 'Sold', pending: 'Selling', failed: 'Sell failed' },
  claim: { success: 'Claimed', pending: 'Claiming', failed: 'Claim failed' },
  stake: { success: 'Staked', pending: 'Staking', failed: 'Stake failed' },
  unstake: {
    success: 'Unstaked',
    pending: 'Unstaking',
    failed: 'Unstake failed',
  },
  deposit: {
    success: 'Deposited',
    pending: 'Depositing',
    failed: 'Deposit failed',
  },
};
