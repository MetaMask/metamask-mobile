/**
 * Safe-area edges for Follow Trading scroll screens.
 *
 * - **Top** is off: native top padding recalculates mid push transition (TSA-970).
 *   Use `includesTopInset` on the header instead.
 * - **Bottom** is off: scrollable lists extend to the screen edge; bottom
 *   padding would leave dead space below the last row.
 */
export const SCROLLABLE_SCREEN_SAFE_AREA_EDGES = ['left', 'right'] as const;
