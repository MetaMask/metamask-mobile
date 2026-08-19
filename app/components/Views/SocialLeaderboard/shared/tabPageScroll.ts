/**
 * Imperative contract a tab page exposes to `SocialTradersTabsView`.
 *
 * The container's collapsing title is driven by whichever page is visible, so
 * switching tabs between a scrolled page and an unscrolled one would otherwise
 * make the header jump between its collapsed and expanded states. The container
 * uses this handle to bring the incoming page in line with the outgoing one
 * before it becomes visible.
 */
export interface SocialTabPageHandle {
  /**
   * Scrolls the page's list to an absolute content offset, in pixels from the
   * top. Offsets beyond the scrollable range are clamped by the list itself.
   */
  scrollToOffset: (offset: number, animated?: boolean) => void;
}
