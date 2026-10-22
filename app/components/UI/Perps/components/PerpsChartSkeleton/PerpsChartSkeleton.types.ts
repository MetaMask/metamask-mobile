export interface PerpsChartSkeletonProps {
  /**
   * Height of the chart box. Defaults to the market-details chart height so the
   * placeholder and the loaded chart occupy the same space.
   */
  height?: number;
  /**
   * Root test ID. Defaults to the shared Perps chart skeleton id.
   */
  testID?: string;
}
