import type { Asset } from '@metamask/assets-controllers';
import { buildTronStakingRewardsSummary } from './tronStakingRewardsSummary';

describe('buildTronStakingRewardsSummary', () => {
  const baseParams = {
    totalStakedTrx: 100,
    isApyLoading: false,
    nonEvmFiatRate: 0.25,
    currentCurrency: 'usd',
    chainId: 'tron:728126428',
  };

  it('formats total rewards from trxStakingRewards fiat when present', () => {
    const trxStakingRewards = {
      balance: '0.283',
      fiat: { balance: 20, currency: 'USD' },
    } as Asset;

    const result = buildTronStakingRewardsSummary({
      ...baseParams,
      trxStakingRewards,
      apyDecimal: '2.45',
    });

    expect(result.totalSubtitle).toContain('·');
    expect(result.totalSubtitle).toContain('TRX');
    expect(result.showEstimatedSkeleton).toBe(false);
    expect(result.estimatedSubtitle).not.toBeNull();
    expect(result.estimatedSubtitle).toContain('TRX');
  });

  it('derives total fiat from multichain rate when fiat is missing', () => {
    const trxStakingRewards = {
      balance: '10',
    } as Asset;

    const result = buildTronStakingRewardsSummary({
      ...baseParams,
      trxStakingRewards,
      apyDecimal: '10',
    });

    expect(result.totalSubtitle).toMatch(/· .* TRX$/);
  });

  it('shows skeleton for estimated row while APY is loading', () => {
    const result = buildTronStakingRewardsSummary({
      ...baseParams,
      trxStakingRewards: undefined,
      apyDecimal: null,
      isApyLoading: true,
    });

    expect(result.showEstimatedSkeleton).toBe(true);
    expect(result.estimatedSubtitle).toBeNull();
  });

  it('uses placeholder when APY finished loading but is unavailable', () => {
    const result = buildTronStakingRewardsSummary({
      ...baseParams,
      trxStakingRewards: undefined,
      apyDecimal: null,
      isApyLoading: false,
    });

    expect(result.showEstimatedSkeleton).toBe(false);
    expect(result.estimatedSubtitle).toBe('— · —');
  });

  it('computes estimated rewards from totalStakedTrx and apyDecimal', () => {
    const result = buildTronStakingRewardsSummary({
      ...baseParams,
      totalStakedTrx: 100,
      trxStakingRewards: { balance: '0' } as Asset,
      apyDecimal: '2.44',
    });

    expect(result.estimatedSubtitle).toContain('2.440 TRX');
  });
});
