/**
 * Prices redeemable credit / stablecoin balances as 1 token ≈ 1 USD.
 * Upgrade path is a market-data lookup by token address.
 */
export const getStablecoinFiatAmount = (
  balance: number,
  usdToFiat: number | undefined,
): number | undefined => {
  if (usdToFiat === undefined || !Number.isFinite(balance)) {
    return undefined;
  }
  return balance * usdToFiat;
};
