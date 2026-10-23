/**
 * One placeholder candle. Every field is a fraction from 0 to 1.
 * `bodyTop` and `wickTop` are measured from the top of the price pane.
 * `volume` is the bar height within the volume pane.
 */
export interface ChartCandleSkeletonCandle {
  bodyTop: number;
  bodyHeight: number;
  wickTop: number;
  wickHeight: number;
  volume: number;
}

export interface ChartCandleSkeletonProps {
  /**
   * Height of the chart box. Callers pass the chart height so the placeholder
   * occupies the same space.
   */
  height?: number;
  /** Root test ID. */
  testID?: string;
}
