/**
 * Extra height under a Money dashboard panel so its end can scroll into view.
 *
 * The collapsing block overdraws below the fold by the large-title height, and
 * the shared scroller's layout box includes that overdraw. The parent clips
 * it. A panel taller than the visible area, but shorter than the scroller plus
 * another title height, never collapses the title far enough for scroll to
 * catch that clip. The opt-in block on Ways to earn sits in that band. Pad up
 * to the threshold. A panel that already fits, or that is already tall enough
 * to collapse the title, stays as it is.
 */
export function rewardsMoneyScrollClipSpacer({
  rawContentHeight,
  scrollViewportHeight,
  titleSectionHeight,
}: {
  rawContentHeight: number;
  scrollViewportHeight: number;
  titleSectionHeight: number;
}): number {
  if (
    titleSectionHeight <= 0 ||
    scrollViewportHeight <= titleSectionHeight ||
    rawContentHeight <= 0
  ) {
    return 0;
  }

  const visibleHeight = scrollViewportHeight - titleSectionHeight;
  const revealThreshold = scrollViewportHeight + titleSectionHeight;
  if (
    rawContentHeight <= visibleHeight ||
    rawContentHeight >= revealThreshold
  ) {
    return 0;
  }

  return Math.ceil(revealThreshold - rawContentHeight);
}
