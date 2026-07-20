/**
 * Layout math for the Trader Position scroll-linked pinned-chart layout.
 *
 * The token info row lives inside the trades list header and scrolls up behind
 * the nav. The chart + time-period selector render in an absolutely-positioned
 * overlay that translates up so it stays glued just below the token row, then
 * pins directly under the nav once the token row has fully scrolled off.
 *
 * IMPORTANT (Reanimated worklet pitfall): these helpers carry the `'worklet'`
 * directive so they CAN run on the UI thread, but Reanimated does NOT auto-bundle
 * sibling worklet helpers that are called from inside another worklet (e.g. from
 * a `useAnimatedStyle`/`useAnimatedReaction` body). Calling them that way crashes
 * with "<fn> is not a function". The view therefore INLINES this same math inside
 * its animated worklets; these exports exist for the JS thread and unit tests.
 */

/**
 * Vertical offset for the pinned chart overlay.
 *
 * At rest (`scrollY === 0`) the chart sits below the token row at
 * `titleSectionHeight`. As the list scrolls the chart rises to `0` (pinned under
 * the nav) and stays there. Negative `scrollY` (pull-to-refresh overscroll) is
 * intentionally preserved so the chart follows the bounce DOWNWARD instead of
 * freezing.
 */
export function getPinnedChartTranslateY(
  titleSectionHeight: number,
  scrollY: number,
): number {
  'worklet';
  const clamped = scrollY < titleSectionHeight ? scrollY : titleSectionHeight;
  return titleSectionHeight - clamped;
}

/**
 * Whether the chart overlay should be elevated — i.e. the token info row has
 * fully scrolled behind the nav. Only true once a real height has been measured
 * (`titleSectionHeight > 0`) so the chart never elevates before layout settles.
 */
export function isPinnedChartElevated(
  titleSectionHeight: number,
  scrollY: number,
): boolean {
  'worklet';
  return titleSectionHeight > 0 && scrollY >= titleSectionHeight;
}

/**
 * Whether the floating sticky day header should be shown.
 *
 * The list header (token row + chart spacer + PnL card) has total height
 * `listHeaderHeight`; the first in-list section header sits directly below it at
 * content offset `listHeaderHeight`. The pinned chart overlay covers the top
 * `chartBlockHeight` of the list, so that section header is still visible below
 * the chart while `scrollY < listHeaderHeight - chartBlockHeight` and only slides
 * behind the chart's bottom edge once `scrollY >= listHeaderHeight - chartBlockHeight`.
 *
 * The floating sticky is therefore the handoff for that moment: before it the
 * natural in-list header is shown; at/after it the in-list header is behind the
 * chart and the floating sticky takes over, so the two are never visible at once.
 * Guarded on measured heights so it never shows before layout settles.
 */
export function isStickyDayHeaderVisible(
  listHeaderHeight: number,
  chartBlockHeight: number,
  scrollY: number,
): boolean {
  'worklet';
  return (
    listHeaderHeight > 0 &&
    chartBlockHeight > 0 &&
    scrollY >= listHeaderHeight - chartBlockHeight
  );
}

/**
 * Cumulative start offset of each day section, measured from the top of the
 * first section (i.e. relative to `listHeaderHeight`, so `offsets[0]` is always
 * `0`). Rows and section headers are treated as uniform height — a deliberate
 * approximation that derives smooth, frame-accurate section geometry from a few
 * measured constants instead of the batched/laggy `onViewableItemsChanged`.
 *
 * Section `i` occupies, in content space:
 * `sectionHeaderHeight + sectionItemCounts[i] * rowHeight`, so the next
 * section starts that much further down.
 */
export function computeSectionStartOffsets(
  sectionItemCounts: number[],
  rowHeight: number,
  sectionHeaderHeight: number,
): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const count of sectionItemCounts) {
    offsets.push(cursor);
    cursor += sectionHeaderHeight + count * rowHeight;
  }
  return offsets;
}

/**
 * Index of the day section currently pinned behind the chart's bottom edge — the
 * label the floating sticky should show — or `-1` when the sticky is hidden.
 *
 * The probe is the content offset of the chart's bottom edge expressed relative
 * to the first section: `scrollY + chartBlockHeight - listHeaderHeight`. While it
 * is negative the first section header is still visible below the chart (sticky
 * hidden, matching {@link isStickyDayHeaderVisible}); otherwise the active
 * section is the last one whose start offset is at or above the probe.
 *
 * `sectionStartOffsets` are relative offsets from {@link computeSectionStartOffsets}.
 * The view INLINES this math inside its `useAnimatedReaction` worklet (see the
 * worklet pitfall note above); this export exists for the JS thread and tests.
 */
export function resolveTopDayIndex(
  sectionStartOffsets: number[],
  listHeaderHeight: number,
  chartBlockHeight: number,
  scrollY: number,
): number {
  if (listHeaderHeight <= 0 || chartBlockHeight <= 0) {
    return -1;
  }
  const probe = scrollY + chartBlockHeight - listHeaderHeight;
  if (probe < 0) {
    return -1;
  }
  let index = -1;
  for (let i = 0; i < sectionStartOffsets.length; i++) {
    if (sectionStartOffsets[i] <= probe) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
