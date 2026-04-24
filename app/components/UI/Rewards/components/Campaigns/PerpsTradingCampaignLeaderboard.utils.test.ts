import { formatPnl } from './PerpsTradingCampaignLeaderboard.utils';

describe('formatPnl', () => {
  it('formats positive pnl with leading plus and dollar sign', () => {
    expect(formatPnl(1234)).toBe('+$1,234');
  });

  it('formats negative pnl with leading minus and dollar sign', () => {
    expect(formatPnl(-567)).toBe('-$567');
  });

  it('formats zero as positive', () => {
    expect(formatPnl(0)).toBe('+$0');
  });

  it('formats large positive value with comma separator', () => {
    expect(formatPnl(10000)).toBe('+$10,000');
  });

  it('formats large negative value with comma separator', () => {
    expect(formatPnl(-25000)).toBe('-$25,000');
  });

  it('rounds fractional values to whole dollars', () => {
    expect(formatPnl(999.9)).toBe('+$1,000');
    expect(formatPnl(-0.5)).toBe('-$1');
  });
});
