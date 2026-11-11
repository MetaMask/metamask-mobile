/**
 * Native ticker used as the preferred key when resolving fiat conversion
 * rates from {@link CurrencyRateController} state.
 */
export const ETH_TICKER = 'ETH';

export const STABLECOIN_TOKEN_SYMBOLS = [
  'USDC',
  'USDT',
  'DAI',
  'mUSD',
  'MUSD',
  'PYUSD',
] as const;
