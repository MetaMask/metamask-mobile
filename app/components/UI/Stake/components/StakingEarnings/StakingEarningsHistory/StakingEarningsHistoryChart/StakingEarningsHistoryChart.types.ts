export interface StakingEarningsHistoryChartData {
  value: number;
  label: string;
}

export interface StakingEarningsHistoryChartProps {
  earnings: StakingEarningsHistoryChartData[];
  ticker: string;
  earningsTotal: string;
  // callback to handle selected earning
  onSelectedEarning?: (earning?: { value: number; label: string }) => void;
  // format the graph value from parent
  formatValue?: (value: number) => string;
}

export interface HorizontalLinesProps {
  // sends bandwidth to parent
  onBandWidthChange?: (bandWidth: number) => void;
  strokeColor: string;
  // BarChart component props are passed into all children
  x?: (number: number) => number;
  y?: (number: number) => number;
  height?: number;
  bandwidth?: number;
  data?: StakingEarningsHistoryChartProps['earnings'];
}
