/**
 * The wallet home scroll view extends underneath the floating tab bar, so a
 * header can be reported as displayed while the bar covers its tap point.
 */
export interface VerticalRect {
  y: number;
  height: number;
}

// Pixels of breathing room around the bar; tuned by eye, not derived from dp.
const TAB_BAR_TOP_PADDING_PX = 16;
const CLEARANCE_MARGIN_PX = 24;

/**
 * How far (in px) the home list must scroll for `target` to sit fully above the
 * floating tab bar. 0 when it is already clear.
 *
 * @param tabBarTop Top edge (y) of the tab bar's first button.
 */
export function pixelsToClearTabBar(
  target: VerticalRect,
  tabBarTop: number,
): number {
  const barEdge = tabBarTop - TAB_BAR_TOP_PADDING_PX;
  const targetBottom = target.y + target.height;
  return Math.max(0, Math.ceil(targetBottom + CLEARANCE_MARGIN_PX - barEdge));
}
