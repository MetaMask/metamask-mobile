import {
  getPinnedChartTranslateY,
  isPinnedChartElevated,
} from './traderPositionScrollLayout';

describe('getPinnedChartTranslateY', () => {
  it('sits the chart below the token row at rest', () => {
    expect(getPinnedChartTranslateY(120, 0)).toBe(120);
  });

  it('rises with scroll until the chart pins under the nav', () => {
    expect(getPinnedChartTranslateY(120, 50)).toBe(70);
    expect(getPinnedChartTranslateY(120, 120)).toBe(0);
  });

  it('keeps the chart pinned once the token row has scrolled off', () => {
    expect(getPinnedChartTranslateY(120, 300)).toBe(0);
  });

  it('follows pull-to-refresh overscroll downward for negative scroll', () => {
    expect(getPinnedChartTranslateY(120, -40)).toBe(160);
  });
});

describe('isPinnedChartElevated', () => {
  it('stays false before a real title height is measured', () => {
    expect(isPinnedChartElevated(0, 999)).toBe(false);
  });

  it('is false while the token row is still partly visible', () => {
    expect(isPinnedChartElevated(120, 0)).toBe(false);
    expect(isPinnedChartElevated(120, 119)).toBe(false);
  });

  it('is true once the token row has fully scrolled behind the nav', () => {
    expect(isPinnedChartElevated(120, 120)).toBe(true);
    expect(isPinnedChartElevated(120, 200)).toBe(true);
  });
});
