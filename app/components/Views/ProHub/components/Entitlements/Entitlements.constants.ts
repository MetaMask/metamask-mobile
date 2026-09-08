/**
 * Entrance sequence for the benefits list.
 *
 * Each row's bar depletes shortly after that row arrives, rather than every bar
 * waiting for the whole cascade and then draining in unison. Because the bars
 * start full, they carry real information the moment they appear — so a
 * per-row drain reads as the row settling into its value, where a deferred
 * synchronised sweep left the first bar sitting untouched for most of a second
 * while the rest of the list came in.
 */
export const ENTITLEMENT_INTRO = {
  /** Gap between consecutive rows arriving. */
  ROW_STAGGER_MS: 75,
  /** How long a single row takes to fade and rise into place. */
  ROW_MS: 340,
  /** Distance a row travels on the way in, in points. */
  ROW_TRAVEL: 10,
  /**
   * Beat between a row starting to arrive and its bar starting to drain. Long
   * enough to register the full allowance first, short enough that the drain
   * still belongs to the same gesture as the row's entrance.
   */
  BAR_LEAD_IN_MS: 200,
  /** How long a bar takes to drain to its remaining value. */
  BAR_DEPLETE_MS: 640,
} as const;

/** When `rowIndex` starts animating in. */
export const rowEntranceDelayMs = (rowIndex: number): number =>
  rowIndex * ENTITLEMENT_INTRO.ROW_STAGGER_MS;

/** When `rowIndex`'s bar starts draining. */
export const rowBarDelayMs = (rowIndex: number): number =>
  rowEntranceDelayMs(rowIndex) + ENTITLEMENT_INTRO.BAR_LEAD_IN_MS;
