import {
  computeSectionStartOffsets,
  getPinnedChartTranslateY,
  isPinnedChartElevated,
  isStickyDayHeaderVisible,
  resolveTopDayIndex,
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

describe('computeSectionStartOffsets', () => {
  const rowHeight = 60;
  const sectionHeaderHeight = 40;

  it('returns no offsets when there are no sections', () => {
    expect(
      computeSectionStartOffsets([], rowHeight, sectionHeaderHeight),
    ).toEqual([]);
  });

  it('starts the first section at offset 0', () => {
    expect(
      computeSectionStartOffsets([3], rowHeight, sectionHeaderHeight),
    ).toEqual([0]);
  });

  it('accumulates each section header plus its rows for the next start', () => {
    // section 0: header(40) + 2*60 = 160 -> section 1 starts at 160
    // section 1: header(40) + 1*60 = 100 -> section 2 starts at 260
    expect(
      computeSectionStartOffsets([2, 1, 3], rowHeight, sectionHeaderHeight),
    ).toEqual([0, 160, 260]);
  });
});

describe('resolveTopDayIndex', () => {
  // offsets relative to the first section; first section starts at content
  // offset listHeaderHeight (500), so the chart bottom edge reaches it when
  // scrollY + chartBlockHeight >= 500 i.e. scrollY >= 200.
  const sectionOffsets = [0, 160, 260];
  const listHeaderHeight = 500;
  const chartBlockHeight = 300;

  it('returns -1 before the heights are measured', () => {
    expect(resolveTopDayIndex(sectionOffsets, 0, chartBlockHeight, 999)).toBe(
      -1,
    );
    expect(resolveTopDayIndex(sectionOffsets, listHeaderHeight, 0, 999)).toBe(
      -1,
    );
  });

  it('returns -1 while the first section header is still below the chart', () => {
    expect(
      resolveTopDayIndex(sectionOffsets, listHeaderHeight, chartBlockHeight, 0),
    ).toBe(-1);
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        199,
      ),
    ).toBe(-1);
  });

  it('selects the first section once it reaches the chart bottom edge', () => {
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        200,
      ),
    ).toBe(0);
  });

  it('advances to each deeper section as the probe passes its start offset', () => {
    // probe = scrollY + 300 - 500. index 1 starts at 160 -> scrollY 360.
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        360,
      ),
    ).toBe(1);
    // index 2 starts at 260 -> scrollY 460.
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        460,
      ),
    ).toBe(2);
  });

  it('stays on the last section when scrolled past the final offset', () => {
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        5000,
      ),
    ).toBe(2);
  });

  it('matches the visibility gate at the handoff threshold', () => {
    // The sticky becomes visible (index >= 0) exactly when isStickyDayHeaderVisible
    // turns true — they share the same probe so the label never lags the gate.
    expect(
      isStickyDayHeaderVisible(listHeaderHeight, chartBlockHeight, 200),
    ).toBe(true);
    expect(
      resolveTopDayIndex(
        sectionOffsets,
        listHeaderHeight,
        chartBlockHeight,
        200,
      ),
    ).toBe(0);
  });
});
