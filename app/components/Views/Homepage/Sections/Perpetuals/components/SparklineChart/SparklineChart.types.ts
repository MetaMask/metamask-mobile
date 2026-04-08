export interface SparklineChartProps {
  /** Array of close prices to plot */
  data: number[];
  /** Chart width in pixels */
  width: number;
  /** Chart height in pixels */
  height: number;
  /** Stroke color for the line */
  color: string;
  /** Stroke width (default: 1.5) */
  strokeWidth?: number;
  /** Whether to show a gradient fill under the line (default: true) */
  showGradient?: boolean;
  /** Unique ID for SVG gradient (needed when rendering multiple charts) */
  gradientId?: string;
  /** Whether to animate the chart reveal from left to right (default: true) */
  animated?: boolean;
  /** Duration of the reveal animation in ms (default: 800) */
  animationDuration?: number;
  /** Background color for the reveal cover — must match the parent background for the wipe effect */
  revealColor?: string;
  /** Test ID for E2E testing */
  testID?: string;
}
