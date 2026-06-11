/**
 * Native ticker used as the preferred key when resolving fiat conversion
 * rates from {@link CurrencyRateController} state.
 */
export const ETH_TICKER = 'ETH';

/**
 * Token a Money-account withdrawal pays out in. Withdrawals are currently
 * hardcoded to USDC (see `buildMoneyAccountWithdrawBatch`), so a "Sent" row is
 * always "mUSD → USDC". Used as the destination-symbol fallback when the token
 * can't be resolved from the registry (it usually isn't held). Revisit if the
 * receive token becomes user-selectable.
 */
export const MONEY_WITHDRAW_TOKEN_SYMBOL = 'USDC';
