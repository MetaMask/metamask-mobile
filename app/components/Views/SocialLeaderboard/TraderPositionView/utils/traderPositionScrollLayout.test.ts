import {
  getPinnedChartTranslateY,
  isPinnedChartElevated,
  isStickyDayHeaderVisible,
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

describe('isStickyDayHeaderVisible', () => {
  // listHeader = token row (120) + chart spacer (300) + PnL card (80) = 500;
  // the first section header reaches the chart's bottom edge at
  // scrollY = listHeaderHeight - chartBlockHeight = 500 - 300 = 200.
  const listHeaderHeight = 500;
  const chartBlockHeight = 300;

  it('stays false before the heights are measured', () => {
    expect(isStickyDayHeaderVisible(0, chartBlockHeight, 999)).toBe(false);
    expect(isStickyDayHeaderVisible(listHeaderHeight, 0, 999)).toBe(false);
  });

  it('is false while the PnL card and first section header are still below the chart', () => {
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 0),
    ).toBe(false);
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 199),
    ).toBe(false);
  });

  it('is true once the first section header reaches the chart bottom edge', () => {
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 200),
    ).toBe(true);
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 600),
    ).toBe(true);
  });

  it('does not turn on at the chart-pin threshold, only at the deeper handoff', () => {
    // titleSectionHeight (120) pins the chart, but the sticky must wait until
    // the deeper threshold (200) so the in-list header isn't duplicated.
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 120),
    ).toBe(false);
  });
});
