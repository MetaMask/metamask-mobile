/**
 * SpendingLimit screen accepts an optional `source` route param that tells the
 * screen which delegation mode it is running in:
 * - `'wallet'`: default. The user is setting a spending limit on a wallet
 * token; submit dispatches the EOA delegation flow.
 * - `'moneyAccount'`: the user landed here from the Money Account → Card
 * linkage flow with the primary Money Account and Monad USDC locked.
 * Submit dispatches `useMoneyAccountCardLinkage.linkInteractive`.
 *
 * The constant below is the single source of truth so router callsites and
 * the SpendingLimit screen agree on the exact string and there is no
 * stringly-typed drift.
 */
export const MONEY_ACCOUNT_CARD_SOURCE = 'moneyAccount' as const;
export const WALLET_CARD_SOURCE = 'wallet' as const;

export type CardSpendingLimitSource =
  | typeof MONEY_ACCOUNT_CARD_SOURCE
  | typeof WALLET_CARD_SOURCE;

export interface CardSpendingLimitRouteParams {
  source?: CardSpendingLimitSource;
}

/**
 * Type guard. Returns true iff the SpendingLimit screen is being entered in
 * fixed Money Account mode (locked account + locked Monad USDC token).
 */
export const isMoneyAccountCardSource = (
  source: CardSpendingLimitSource | undefined,
): boolean => source === MONEY_ACCOUNT_CARD_SOURCE;
