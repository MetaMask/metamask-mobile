/** Minimum claimable bonus (USD) to show the "Claim bonus" CTA; below this we show "3% bonus" instead. */
export const MIN_CLAIMABLE_BONUS_USD = 0.01;

/**
 * Returns true when the claimable reward string represents an amount >= MIN_CLAIMABLE_BONUS_USD.
 * useMerklRewards returns "< 0.01" for very small amounts; we do not show "Claim bonus" for those.
 */
export const isClaimableBonusAboveThreshold = (
  reward: string | null,
): boolean => {
  if (!reward || typeof reward !== 'string') return false;
  if (reward.startsWith('<')) return false;
  const value = parseFloat(reward);
  if (Number.isNaN(value)) return false;
  return value >= MIN_CLAIMABLE_BONUS_USD;
};
