import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';
import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../../component-library/hooks';
import { styleSheet } from './CandlestickChartAuxiliaryLines.styles';
import { PerpsChartAuxiliaryLinesSelectorsIDs } from '../../../../../../../e2e/selectors/Perps/Perps.selectors';

export interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  entryPrice?: string;
  liquidationPrice?: string | null;
  currentPrice?: string;
}

export interface AuxiliaryLinePosition {
  type: 'tp' | 'sl' | 'entry' | 'liquidation' | 'current';
  price: number;
  position: number;
}

interface CandlestickChartAuxiliaryLinesProps {
  /** TP/SL line data */
  tpslLines?: TPSLLines;
  /** Transformed chart data for price calculations */
  transformedData: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  /** Chart height for position calculations */
  height: number;
  /** Chart width for line rendering */
  chartWidth: number;
  /** Whether to show the lines */
  visible: boolean;
  /** Test ID for the container */
  testID?: string;
}

/**
 * Component for rendering auxiliary lines on candlestick charts
 * Supports Take Profit, Stop Loss, Entry, Liquidation, and Current Price lines
 */
const CandlestickChartAuxiliaryLines: React.FC<
  CandlestickChartAuxiliaryLinesProps
> = ({
  tpslLines,
  transformedData,
  height,
  chartWidth,
  visible,
  testID = PerpsChartAuxiliaryLinesSelectorsIDs.AUXILIARY_LINES,
}) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { colors: themeColors } = theme;

  // Calculate line positions based on price data
  const linePositions = useMemo((): AuxiliaryLinePosition[] | null => {
    if (!tpslLines || transformedData.length === 0) return null;

    const prices = transformedData.flatMap((d) => [
      d.open,
      d.high,
      d.low,
      d.close,
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const chartHeight = height - PERPS_CHART_CONFIG.PADDING.VERTICAL;

    const lines: AuxiliaryLinePosition[] = [];

    // Take Profit line
    if (tpslLines.takeProfitPrice) {
      const tpPrice = parseFloat(tpslLines.takeProfitPrice);
      if (tpPrice >= minPrice && tpPrice <= maxPrice && priceRange > 0) {
        const normalizedPosition = (tpPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'tp', price: tpPrice, position });
      }
    }

    // Stop Loss line
    if (tpslLines.stopLossPrice) {
      const slPrice = parseFloat(tpslLines.stopLossPrice);
      if (slPrice >= minPrice && slPrice <= maxPrice && priceRange > 0) {
        const normalizedPosition = (slPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'sl', price: slPrice, position });
      }
    }

    // Entry Price line
    if (tpslLines.entryPrice) {
      const entryPrice = parseFloat(tpslLines.entryPrice);
      if (entryPrice >= minPrice && entryPrice <= maxPrice && priceRange > 0) {
        const normalizedPosition = (entryPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'entry', price: entryPrice, position });
      }
    }

    // Liquidation Price line
    if (tpslLines.liquidationPrice) {
      const liquidationPrice = parseFloat(tpslLines.liquidationPrice);
      if (
        liquidationPrice >= minPrice &&
        liquidationPrice <= maxPrice &&
        priceRange > 0
      ) {
        const normalizedPosition = (liquidationPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'liquidation', price: liquidationPrice, position });
      }
    }

    // Current Price line
    if (tpslLines.currentPrice) {
      const currentPrice = parseFloat(tpslLines.currentPrice);
      if (
        currentPrice >= minPrice &&
        currentPrice <= maxPrice &&
        priceRange > 0
      ) {
        const normalizedPosition = (currentPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'current', price: currentPrice, position });
      }
    }

    return lines.length > 0 ? lines : null;
  }, [tpslLines, transformedData, height]);

  // Get line color based on type
  const getLineColor = (type: AuxiliaryLinePosition['type']): string => {
    switch (type) {
      case 'tp':
        return themeColors.success.default; // Green for Take Profit
      case 'sl':
        return themeColors.border.default; // Gray for Stop Loss
      case 'entry':
        return themeColors.text.alternative; // Light Gray for Entry Price
      case 'liquidation':
        return themeColors.error.default; // Pink/Red for Liquidation Price
      case 'current':
        return themeColors.text.default; // White for Current Price
      default:
        return themeColors.text.default;
    }
  };

  if (!visible || !linePositions) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {linePositions.map((line, index) => {
        const lineColor = getLineColor(line.type);

        return (
          <View
            key={`auxiliary-line-${line.type}-${index}`}
            testID={`auxiliary-line-${line.type}-${index}`}
            style={[
              styles.line,
              {
                top: line.position,
                width: chartWidth - 65, // Match the chart width
              },
            ]}
          >
            <Svg height="1" width="100%">
              <Line
                x1="0"
                y1="0.5"
                x2="100%"
                y2="0.5"
                stroke={lineColor}
                strokeWidth="1"
                strokeDasharray="5, 3" // Dash length, gap length
              />
            </Svg>
          </View>
        );
      })}
    </View>
  );
};

export default CandlestickChartAuxiliaryLines;
