/**
 * Resolves the **projected** campaign tier index from a single balance snapshot:
 * the tier with the largest `minNetDeposit` (`value`) that the balance still
 * meets. This does **not** imply the user has **qualified** for that tier’s
 * prize — qualification may require a consecutive-day streak (see
 * `ondoTierStreak.ts` / `buildTierStreakSeries`).
 *
 * Index matches `campaign.details.tiers` / `thresholdLines` order.
 */
export function resolveCurrentTierCampaignIndex(
  lastBalance: number,
  tiers: { value: number }[],
): number {
  if (tiers.length === 0) {
    return -1;
  }
  let bestIdx = -1;
  let bestMin = -Infinity;
  for (let i = 0; i < tiers.length; i++) {
    const m = tiers[i].value;
    if (lastBalance >= m && m >= bestMin) {
      bestMin = m;
      bestIdx = i;
    }
  }
  return bestIdx;
}
