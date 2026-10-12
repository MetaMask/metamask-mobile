import { toPerpsSizeUnitAnalyticsValue } from './perpsSizeDenomination';

describe('toPerpsSizeUnitAnalyticsValue', () => {
  it('maps USD to usd', () => {
    expect(toPerpsSizeUnitAnalyticsValue('usd')).toBe('usd');
  });

  it('maps the asset denomination to coin', () => {
    expect(toPerpsSizeUnitAnalyticsValue('asset')).toBe('coin');
  });
});
