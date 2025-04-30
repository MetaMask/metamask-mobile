import React, { useCallback, useEffect, useState } from 'react';
import { GestureResponderEvent, View, LayoutChangeEvent } from 'react-native';
import { Defs, Line, LinearGradient, Stop } from 'react-native-svg';
import { BarChart, Grid } from 'react-native-svg-charts';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useTheme } from '../../../../../../../util/theme';
import styleSheet from './StakingEarningsHistoryChart.styles';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  HorizontalLinesProps,
  StakingEarningsHistoryChartProps,
} from './StakingEarningsHistoryChart.types';

const HorizontalLines = ({
  x,
  y,
  height,
  bandwidth: bandWidth,
  data,
  onBandWidthChange,
  strokeColor,
}: HorizontalLinesProps) => {
  useEffect(() => {
    onBandWidthChange && onBandWidthChange(bandWidth ?? 0);
  }, [bandWidth, onBandWidthChange]);

  const renderBarTopLines = useCallback(() => {
    if (!x || !y || !height || !data || !bandWidth) return null;

    return data.map((item, index) => (
      <Line
        testID={`earning-history-chart-line-${index}`}
        key={`earning-history-chart-line-${index}`}
        x1={x(index)}
        x2={x(index) + bandWidth}
        y1={y(item.value) - 0.5}
        y2={y(item.value) - 0.5}
        stroke={strokeColor}
        strokeWidth={1}
      />
    ));
  }, [data, x, y, height, bandWidth, strokeColor]);

  return <>{renderBarTopLines()}</>;
};

export function StakingEarningsHistoryChart({
  earnings,
  ticker,
  earningsTotal,
  formatValue = (value) => value.toFixed(5),
  onSelectedEarning,
}: StakingEarningsHistoryChartProps): React.ReactElement {
  //hooks
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  // constants
  const animate = false;
  const barGradientId = 'bar-gradient';
  const barGradientStop1 = {
    offset: '0%',
    stopColor: colors.success.muted,
    stopOpacity: 0,
  };
  const barGradientStop2 = {
    offset: '100%',
    stopColor: colors.success.muted,
    stopOpacity: 0.1,
  };
  const spacingDefault = 0;

  //states
  const [selectedBarAmount, setSelectedBarAmount] = useState<string | null>(
    null,
  );
  const [lastOnSelectedEarningBarIndex, setLastOnSelectedEarningBarIndex] =
    useState<number>(-1);
  const [lastToggledBarIndex, setLastToggledBarIndex] = useState<number>(-1);
  const [barToggle, setBarToggle] = useState<boolean>(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(-1);
  const [selectedBarLabel, setSelectedBarLabel] = useState<string | null>(null);
  const [bandWidth, setBandWidth] = useState<number>(0);
  const [spacing, setSpacing] = useState<number>(spacingDefault);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number>(-1);
  const [transformedData, setTransformedData] = useState<
    {
      value: number;
      label: string;
      svg: { fill: string; testID: string };
    }[]
  >([]);

  // functions
  const updateBarHoveredBarIndex = useCallback(
    (xHover: number) => {
      if (!bandWidth || !chartWidth || !earnings.length) return;
      const barWidthTotal = bandWidth * earnings.length;
      const spacingTotal = chartWidth - barWidthTotal;
      const estimateGapSize = spacingTotal
        ? spacingTotal / (earnings.length - 1)
        : 0;
      const barSegment = Math.floor(xHover / (bandWidth + estimateGapSize));
      if (barSegment >= 0 && barSegment < earnings.length) {
        setHoveredBarIndex(barSegment);
      } else {
        setHoveredBarIndex(-1);
      }
    },
    [bandWidth, chartWidth, earnings.length],
  );
  const handleTouchEnd = () => {
    setHoveredBarIndex(-1);
    let overrideBarToggle = !!barToggle;
    if (lastToggledBarIndex !== selectedBarIndex) {
      overrideBarToggle = false;
    }
    if (!overrideBarToggle) {
      setBarToggle(true);
      setLastToggledBarIndex(selectedBarIndex);
    } else {
      setBarToggle(false);
      if (
        lastToggledBarIndex !== -1 &&
        lastToggledBarIndex === selectedBarIndex
      ) {
        setSelectedBarIndex(-1);
        setLastToggledBarIndex(-1);
      }
    }
  };
  const handleTouch = (evt: GestureResponderEvent) => {
    updateBarHoveredBarIndex(evt.nativeEvent.locationX);
  };

  // update bar fill color on index change
  useEffect(() => {
    setTransformedData((prev) => {
      const newTransformedData = [...prev];
      newTransformedData.forEach((data, index) => {
        if (index === selectedBarIndex) {
          data.svg.fill = colors.success.default;
        } else {
          data.svg.fill = `url(#${barGradientId})`;
        }
      });
      return newTransformedData;
    });
  }, [selectedBarIndex, colors.success.default]);
  // if there is graph data or width change update all state
  useEffect(() => {
    if (earnings && earnings.length > 0) {
      let newSpacing = spacingDefault;
      if (earnings.length > 1) {
        newSpacing = 0.1;
      }
      setSpacing(newSpacing);
      const newTransformedData = earnings.map((value, index) => ({
        value: value.value,
        label: value.label,
        svg: {
          fill: `url(#${barGradientId})`,
          testID: `earning-history-chart-bar-${index}`,
        },
      }));
      setTransformedData(newTransformedData);
    }
  }, [earnings, chartWidth]);
  // select what is hovered over
  useEffect(() => {
    if (hoveredBarIndex !== -1) {
      setSelectedBarIndex(hoveredBarIndex);
    }
  }, [hoveredBarIndex]);
  // main updates, time period earnings change, selected bar change
  useEffect(() => {
    if (selectedBarIndex !== -1 && selectedBarIndex < earnings.length) {
      const newSelectedBarAmount = formatValue(
        earnings[selectedBarIndex].value,
      );
      const newSelectedBarLabel = earnings[selectedBarIndex].label;
      setSelectedBarAmount(newSelectedBarAmount);
      setSelectedBarLabel(newSelectedBarLabel);
    } else {
      setSelectedBarAmount(null);
      setSelectedBarLabel(null);
    }
    if (
      onSelectedEarning &&
      lastOnSelectedEarningBarIndex !== selectedBarIndex
    ) {
      onSelectedEarning(earnings[selectedBarIndex]);
      setLastOnSelectedEarningBarIndex(selectedBarIndex);
    }
  }, [
    selectedBarIndex,
    earnings,
    formatValue,
    colors.success.default,
    onSelectedEarning,
    lastToggledBarIndex,
    lastOnSelectedEarningBarIndex,
  ]);
  // reset bar toggle state when earnings array changes
  useEffect(() => {
    // deselect all bars each change
    setSelectedBarIndex(-1);
    setLastToggledBarIndex(-1);
    setBarToggle(false);
  }, [earnings]);

  return earnings ? (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setChartWidth(width);
      }}
      testID={'earnings-history-chart-container'}
    >
      <View>
        <View style={styles.stakingEarningsHistoryChartHeaderContainer}>
          <Text variant={TextVariant.HeadingLG} color={colors.success.default}>
            {selectedBarAmount ?? earningsTotal} {ticker}
          </Text>
          <Text variant={TextVariant.BodyMD} color={colors.text.alternative}>
            {selectedBarLabel ?? `Lifetime earnings`}
          </Text>
        </View>
        <View
          style={styles.stakingEarningsHistoryChartContainer}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={handleTouchEnd}
          testID="earnings-history-chart"
        >
          <BarChart
            animate={animate}
            style={[styles.stakingEarningsHistoryChart]}
            data={transformedData}
            width={chartWidth}
            gridMin={0}
            contentInset={{ top: 1, bottom: 0 }}
            yAccessor={({ item }) => item.value}
            spacingInner={spacing}
            spacingOuter={0}
          >
            <Grid
              svg={{ stroke: 'transparent' }} // remove grid lines
            />
            <Defs>
              <LinearGradient
                id={barGradientId}
                x1="0%"
                y1="100%"
                x2="0%"
                y2="0%"
              >
                <Stop {...barGradientStop1} />
                <Stop {...barGradientStop2} />
              </LinearGradient>
            </Defs>
            <HorizontalLines
              onBandWidthChange={setBandWidth}
              strokeColor={colors.success.default}
            />
          </BarChart>
        </View>
      </View>
    </View>
  ) : (
    <SkeletonPlaceholder>
      <SkeletonPlaceholder.Item width={343} height={144} borderRadius={6} />
    </SkeletonPlaceholder>
  );
}
