import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import {
  formatQuickBuyPillLabel,
  getBuyQuickAmounts,
  resolveBuyQuickAmounts,
  resolveSellQuickPercentages,
  snapToNiceFiatAmount,
  USD_QUICK_BUY_BASE,
} from './quickBuyQuickAmounts';

jest.mock('../../../../../../UI/Bridge/utils/currencyUtils', () => ({
  formatCurrency: jest.fn(
    (amount: number, currency: string) => `${currency}:${amount}`,
  ),
  getCurrencySymbol: jest.fn((currency: string) => `$${currency}`),
}));

describe('quickBuyQuickAmounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('snapToNiceFiatAmount', () => {
    it('returns USD tiers unchanged at a 1:1 rate', () => {
      expect(snapToNiceFiatAmount(10, 'USD')).toBe(10);
      expect(snapToNiceFiatAmount(50, 'USD')).toBe(50);
      expect(snapToNiceFiatAmount(100, 'USD')).toBe(100);
      expect(snapToNiceFiatAmount(250, 'USD')).toBe(250);
    });

    it('snaps EUR conversions to round local amounts', () => {
      expect(snapToNiceFiatAmount(9.2, 'EUR')).toBe(10);
      expect(snapToNiceFiatAmount(46, 'EUR')).toBe(50);
    });

    it('snaps JPY to whole yen', () => {
      expect(snapToNiceFiatAmount(1487, 'JPY')).toBe(1500);
      expect(snapToNiceFiatAmount(37500, 'JPY')).toBe(50000);
    });

    it('snaps IDR to whole rupiah', () => {
      expect(snapToNiceFiatAmount(160_000, 'IDR')).toBe(150_000);
    });
  });

  describe('formatQuickBuyPillLabel', () => {
    it('uses full currency formatting for standard-magnitude currencies', () => {
      expect(formatQuickBuyPillLabel(10, 'USD')).toBe('USD:10');
      expect(formatCurrency).toHaveBeenCalledWith(10, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false,
      });
    });

    it('uses compact K labels for high-magnitude JPY amounts', () => {
      expect(formatQuickBuyPillLabel(1500, 'JPY')).toBe('$JPY1.5K');
      expect(formatQuickBuyPillLabel(15000, 'JPY')).toBe('$JPY15K');
      expect(formatCurrency).not.toHaveBeenCalled();
    });

    it('uses compact K/M labels for IDR and KRW', () => {
      expect(formatQuickBuyPillLabel(200_000, 'IDR')).toBe('$IDR200K');
      expect(formatQuickBuyPillLabel(3_500_000, 'KRW')).toBe('$KRW3.5M');
      expect(getCurrencySymbol).toHaveBeenCalledWith('IDR');
    });
  });

  describe('getBuyQuickAmounts', () => {
    it('returns four USD tiers at a 1:1 rate', () => {
      const options = getBuyQuickAmounts('USD', 1);

      expect(options).toHaveLength(4);
      expect(options.map((option) => option.presetValue)).toEqual(
        Array.from(USD_QUICK_BUY_BASE),
      );
      expect(options[0]).toEqual({
        value: 10,
        label: 'USD:10',
        presetValue: 10,
      });
      expect(options[3]).toEqual({
        value: 250,
        label: 'USD:250',
        presetValue: 250,
      });
    });

    it('converts and snaps EUR amounts from the USD anchor', () => {
      const options = getBuyQuickAmounts('EUR', 0.92);

      expect(options[0]?.value).toBe(10);
      expect(options[1]?.value).toBe(50);
      expect(options[0]?.presetValue).toBe(10);
      expect(options[0]?.label).toBe('EUR:10');
    });

    it('converts and snaps JPY amounts with compact labels at higher tiers', () => {
      const options = getBuyQuickAmounts('JPY', 150);

      expect(options[0]).toEqual({
        value: 1500,
        label: '$JPY1.5K',
        presetValue: 1500,
      });
      expect(options[3]?.value).toBe(50000);
      expect(options[3]?.label).toBe('$JPY50K');
    });

    it('normalizes lowercase currency codes', () => {
      const options = getBuyQuickAmounts('jpy', 150);

      expect(options[0]?.value).toBe(1500);
      expect(options[0]?.label).toBe('$JPY1.5K');
    });

    it('uses a 1:1 multiplier when the USD conversion rate is unavailable', () => {
      const options = getBuyQuickAmounts('SEK', undefined);

      expect(options[0]?.value).toBe(10);
      expect(options[0]?.presetValue).toBe(10);
    });
  });

  describe('resolveBuyQuickAmounts', () => {
    it('maps custom persisted amounts to pill options', () => {
      const options = resolveBuyQuickAmounts([5, 35, 50, 99], 'USD');

      expect(options).toEqual([
        { value: 5, label: 'USD:5', presetValue: 5 },
        { value: 35, label: 'USD:35', presetValue: 35 },
        { value: 50, label: 'USD:50', presetValue: 50 },
        { value: 99, label: 'USD:99', presetValue: 99 },
      ]);
    });
  });

  describe('resolveSellQuickPercentages', () => {
    it('maps 100 to the localized max label', () => {
      const options = resolveSellQuickPercentages([25, 50, 75, 100], 'Max');

      expect(options).toEqual([
        { percent: 25, label: '25%' },
        { percent: 50, label: '50%' },
        { percent: 75, label: '75%' },
        { percent: 100, label: 'Max' },
      ]);
    });
  });
});
