import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';
import { styleSheet } from './CandlestickChartGridLines.styles';
import {
  formatPriceForAxis,
  getGridLineStyle,
  getPriceRange,
  ChartDataPoint,
} from '../utils/chartUtils';
import { PerpsChartGridLinesSelectorsIDs } from '../../../../../../../e2e/selectors/Perps/Perps.selectors';

export interface GridLine {
  price: number;
  isEdge: boolean;
  position: number;
}

interface CandlestickChartGridLinesProps {
  /** Transformed chart data for price calculations */
  transformedData: ChartDataPoint[];
  /** Chart height for position calculations */
  height: number;
  /** Chart width for grid line positioning */
  chartWidth?: number;
  /** Test ID for the container */
  testID?: string;
}

/**
 * Component for rendering horizontal grid lines on candlestick charts
 * Creates evenly spaced price lines with labels
 */
const CandlestickChartGridLines: React.FC<CandlestickChartGridLinesProps> = ({
  transformedData,
  height,
  chartWidth,
  testID = PerpsChartGridLinesSelectorsIDs.CHART_GRID_LINES,
}) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  // Calculate evenly spaced horizontal lines with better visibility
  const gridLines = useMemo((): GridLine[] => {
    if (transformedData.length === 0) return [];

    const { minPrice, priceRange } = getPriceRange(transformedData);

    // Create 6 horizontal grid lines (including top and bottom)
    const gridLineCount = PERPS_CHART_CONFIG.GRID_LINE_COUNT;
    const lines: GridLine[] = [];

    for (let i = 0; i < gridLineCount; i++) {
      const price = minPrice + (priceRange * i) / (gridLineCount - 1);
      const isEdgeLine = i === 0 || i === gridLineCount - 1;

      lines.push({
        price,
        isEdge: isEdgeLine,
        position:
          ((gridLineCount - 1 - i) / (gridLineCount - 1)) *
          (height - PERPS_CHART_CONFIG.PADDING.VERTICAL), // Inverted positioning: higher prices at top
      });
    }

    return lines;
  }, [transformedData, height]);

  if (transformedData.length === 0) {
    return null;
  }

  return (
    <View style={styles.gridContainer} testID={testID}>
      {gridLines.map((line, index) => (
        <View
          key={`grid-${index}`}
          testID={`${PerpsChartGridLinesSelectorsIDs.GRID_LINE}-${index}`}
        >
          {/* Grid Line */}
          <View
            style={getGridLineStyle(
              theme.colors,
              line.isEdge,
              line.position,
              chartWidth,
            )}
            testID={`${PerpsChartGridLinesSelectorsIDs.GRID_LINE_BAR}-${index}`}
          />
          {/* Price Label */}
          <View
            style={[
              styles.gridPriceLabel,
              {
                top: line.position - 10, // Center the label on the line
                backgroundColor: theme.colors.background.default,
                borderColor: theme.colors.border.muted,
              },
            ]}
            testID={`${PerpsChartGridLinesSelectorsIDs.GRID_PRICE_LABEL}-${index}`}
          >
            <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
              ${formatPriceForAxis(line.price)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default CandlestickChartGridLines;
