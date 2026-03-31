import { resolveCurrentTierCampaignIndex } from './BalanceHistoryChart.utils';

describe('resolveCurrentTierCampaignIndex', () => {
  const tiers = [
    { label: 'Bronze', value: 0 },
    { label: 'Silver', value: 1000 },
    { label: 'Gold', value: 5000 },
  ];

  it('returns -1 when there are no tiers', () => {
    expect(resolveCurrentTierCampaignIndex(100, [])).toBe(-1);
  });

  it('returns the highest qualifying tier index by min threshold', () => {
    expect(resolveCurrentTierCampaignIndex(500, tiers)).toBe(0);
    expect(resolveCurrentTierCampaignIndex(2500, tiers)).toBe(1);
    expect(resolveCurrentTierCampaignIndex(7500, tiers)).toBe(2);
  });

  it('returns tier 0 when balance is exactly at a single zero threshold', () => {
    expect(resolveCurrentTierCampaignIndex(0, tiers)).toBe(0);
  });
});
