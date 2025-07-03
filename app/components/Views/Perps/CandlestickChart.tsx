import React from 'react';
import { View, Dimensions } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';

interface CandleData {
  coin: string;
  interval: string;
  candles: {
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
}

interface CandlestickChartComponentProps {
  candleData: CandleData | null;
  isLoading?: boolean;
  height?: number;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    chartContainer: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      textAlign: 'center' as const,
      marginVertical: 32,
    },
    noDataText: {
      textAlign: 'center' as const,
      marginVertical: 32,
    },
    priceLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
      alignSelf: 'flex-start' as const,
    },
    priceText: {
      color: colors.text.default,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    dateLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
      alignSelf: 'flex-start' as const,
    },
    dateText: {
      color: colors.text.muted,
      fontSize: 12,
    },
  };
};

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  candleData,
  isLoading = false,
  height = 300,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Account for padding

  // Transform data to wagmi-charts format
  const transformedData = React.useMemo(() => {
    if (!candleData?.candles || candleData.candles.length === 0) {
      return [];
    }

    return candleData.candles.map((candle) => ({
      timestamp: candle.time,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));
  }, [candleData]);

  if (isLoading) {
    return (
      <View style={[styles.container, { height }]}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Muted}
          style={styles.loadingText}
        >
          Loading chart data...
        </Text>
      </View>
    );
  }

  if (!candleData || transformedData.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Muted}
          style={styles.noDataText}
        >
          No chart data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <CandlestickChart.Provider data={transformedData}>
        <View style={styles.chartContainer}>
          {/* Interactive Price Label */}
          <View style={styles.priceLabel}>
            <CandlestickChart.PriceText
              style={styles.priceText}
              format={({ value }) => `$${Number(value).toFixed(2)}`}
            />
          </View>

          {/* Main Candlestick Chart */}
          <CandlestickChart
            height={height - 120} // Account for labels and padding
            width={chartWidth}
          >
            <CandlestickChart.Candles
              positiveColor="#00D68F" // Green for positive candles
              negativeColor="#FF6B6B" // Red for negative candles
            />
            <CandlestickChart.Crosshair>
              <CandlestickChart.Tooltip />
            </CandlestickChart.Crosshair>
          </CandlestickChart>

          {/* Interactive Date Label */}
          <View style={styles.dateLabel}>
            <CandlestickChart.DatetimeText
              style={styles.dateText}
              locale="en-US"
              options={{
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }}
            />
          </View>
        </View>
      </CandlestickChart.Provider>
    </View>
  );
};

export default CandlestickChartComponent;
