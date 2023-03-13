import { TokenPrice } from 'app/components/hooks/Pricing/useTokenHistoricalPrices';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const createStyles = () =>
  StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: 305, // hack to remove internal padding that is not configurable
      paddingTop: 0,
      marginVertical: 10,
    },
    chartLoading: {
      width: Dimensions.get('screen').width,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
  });
const styles = createStyles();

interface PriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
}

const PriceChart = ({ prices, priceDiff, isLoading }: PriceChartProps) => {
  if (isLoading) {
    return (
      <View style={styles.chartLoading}>
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item
            width={Dimensions.get('screen').width - 32}
            height={315}
            borderRadius={6}
          ></SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    );
  }
  return (
    <LineChart
      style={styles.chart}
      data={{
        labels: [],
        datasets: [
          {
            data: prices.map((_: TokenPrice) => _[1]),
          },
        ],
      }}
      width={Dimensions.get('window').width} // from react-native
      height={420}
      formatYLabel={(value) => value}
      withDots={false}
      withInnerLines={false}
      withOuterLines={false}
      withVerticalLines={false}
      withHorizontalLines={false}
      bezier
      withShadow={false}
      chartConfig={{
        backgroundGradientFrom: '#FFF',
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: '#FFF',
        backgroundGradientToOpacity: 0,
        color: () =>
          priceDiff > 0 ? '#28A745' : priceDiff < 0 ? '#FF3B30' : '#535A61',
        strokeWidth: 2, // optional, default 3
        propsForDots: {
          r: '0',
        },
      }}
    />
  );
};

export default PriceChart;
