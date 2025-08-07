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

export interface GridLine {
  price: number;
  isEdge: boolean;
  position: number;
}

interface CandlestickChartGridLinesProps {
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
  /** Test ID for the container */
  testID?: string;
}

// Helper function to format price for y-axis labels
const formatPriceForAxis = (price: number): string =>
  // Round to whole number and add commas for thousands
  Math.round(price).toLocaleString('en-US');

// Helper function to get grid line style
const getGridLineStyle = (
  colors: { border: { muted: string } },
  isEdge: boolean,
  position: number,
) => ({
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: position,
  height: isEdge ? 2 : 1,
  zIndex: 10,
  backgroundColor: colors.border.muted,
  opacity: isEdge
    ? PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR
    : PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
});

/**
 * Component for rendering horizontal grid lines on candlestick charts
 * Creates evenly spaced price lines with labels
 */
const CandlestickChartGridLines: React.FC<CandlestickChartGridLinesProps> = ({
  transformedData,
  height,
  testID = 'chart-grid-lines',
}) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  // Calculate evenly spaced horizontal lines with better visibility
  const gridLines = useMemo((): GridLine[] => {
    if (transformedData.length === 0) return [];

    const prices = transformedData.flatMap((d) => [
      d.open,
      d.high,
      d.low,
      d.close,
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

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
        <View key={`grid-${index}`} testID={`grid-line-${index}`}>
          {/* Grid Line */}
          <View
            style={getGridLineStyle(theme.colors, line.isEdge, line.position)}
            testID={`grid-line-bar-${index}`}
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
            testID={`grid-price-label-${index}`}
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
