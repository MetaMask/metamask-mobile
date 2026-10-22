import React, { useEffect, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';
import { PerpsCandlestickChartSelectorsIDs } from '../../Perps.testIds';
import {
  CHART_SKELETON_BODY_SLOT_RATIO,
  CHART_SKELETON_CANDLE_COUNT,
  CHART_SKELETON_GRID_LINE_THICKNESS,
  CHART_SKELETON_HORIZONTAL_GRID_COUNT,
  CHART_SKELETON_PILL_RADIUS,
  CHART_SKELETON_VERTICAL_GRID_COUNT,
  CHART_SKELETON_VOLUME_HEIGHT_RATIOS,
  CHART_SKELETON_WICK_WIDTH,
  CHART_SKELETON_X_AXIS_LABEL_COUNT,
  CHART_SKELETON_X_PILL_HEIGHT,
  CHART_SKELETON_X_PILL_WIDTH,
  CHART_SKELETON_Y_AXIS_WIDTH,
  CHART_SKELETON_Y_PILL_HEIGHT,
  CHART_SKELETON_Y_PILL_WIDTH,
  getChartSkeletonCandleGeometry,
  getChartSkeletonPaneHeights,
  SKELETON_PULSE_MAX_OPACITY,
  SKELETON_PULSE_MIN_OPACITY,
  SKELETON_PULSE_STEP_MS,
} from './PerpsChartSkeleton.constants';
import type { PerpsChartSkeletonProps } from './PerpsChartSkeleton.types';

const SHAPES_TEST_ID_SUFFIX = '-shapes';

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  absoluteLeft: { position: 'absolute', left: 0 },
  absoluteTop: { position: 'absolute', top: 0 },
  absoluteRight: { position: 'absolute', right: 0 },
  absoluteBottom: { position: 'absolute', bottom: 0 },
  flex: { flex: 1 },
  pill: { borderRadius: CHART_SKELETON_PILL_RADIUS },
});

/**
 * Candle-chart loading skeleton for Perps market details.
 * One parent opacity pulse matches the design-system Skeleton. The leaves are
 * static. Reduce motion keeps the brighter resting opacity and does not loop.
 */
const PerpsChartSkeleton: React.FC<PerpsChartSkeletonProps> = ({
  height = PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT,
  testID = PerpsCandlestickChartSelectorsIDs.SKELETON,
}) => {
  const { colors } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const [width, setWidth] = useState(0);
  const pulse = useSharedValue(SKELETON_PULSE_MAX_OPACITY);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = SKELETON_PULSE_MAX_OPACITY;
      return () => {
        cancelAnimation(pulse);
      };
    }

    const easing = Easing.inOut(Easing.ease);
    pulse.value = withRepeat(
      withSequence(
        withTiming(SKELETON_PULSE_MIN_OPACITY, {
          duration: SKELETON_PULSE_STEP_MS,
          easing,
        }),
        withTiming(SKELETON_PULSE_MAX_OPACITY, {
          duration: SKELETON_PULSE_STEP_MS,
          easing,
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  const { priceHeight, volumeHeight, axisHeight, separator } =
    getChartSkeletonPaneHeights(height);
  const plotWidth = Math.max(0, width - CHART_SKELETON_Y_AXIS_WIDTH);
  const slotWidth = plotWidth > 0 ? plotWidth / CHART_SKELETON_CANDLE_COUNT : 0;
  const bodyWidth = slotWidth * CHART_SKELETON_BODY_SLOT_RATIO;
  const skeletonColor = colors.icon.alternative;
  const gridColor = colors.border.muted;
  const rootStyle = {
    height,
    width: '100%' as const,
    backgroundColor: colors.background.default,
  };
  const pricePaneStyle = { height: priceHeight };
  const separatorStyle = {
    height: separator,
    backgroundColor: gridColor,
  };
  const volumePaneStyle = { height: volumeHeight };
  const axisPaneStyle = { height: axisHeight };
  const volumePillStyle = {
    top: Math.max(0, volumeHeight / 2 - CHART_SKELETON_Y_PILL_HEIGHT / 2),
    width: CHART_SKELETON_Y_PILL_WIDTH,
    height: CHART_SKELETON_Y_PILL_HEIGHT,
    backgroundColor: skeletonColor,
  };

  const horizontalGridTops = Array.from(
    { length: CHART_SKELETON_HORIZONTAL_GRID_COUNT },
    (_, index) => {
      if (CHART_SKELETON_HORIZONTAL_GRID_COUNT <= 1) {
        return 0;
      }
      const raw =
        (priceHeight * index) / (CHART_SKELETON_HORIZONTAL_GRID_COUNT - 1);
      return Math.min(
        raw,
        Math.max(0, priceHeight - CHART_SKELETON_GRID_LINE_THICKNESS),
      );
    },
  );

  return (
    <Box
      testID={testID}
      accessible
      accessibilityLabel={strings('perps.chart.loading')}
      accessibilityRole="progressbar"
      onLayout={handleLayout}
      twClassName="overflow-hidden"
      style={rootStyle}
    >
      <Box
        testID={`${testID}${SHAPES_TEST_ID_SUFFIX}`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.flex}
      >
        <Animated.View pointerEvents="none" style={[styles.flex, pulseStyle]}>
          <Box style={pricePaneStyle}>
            {horizontalGridTops.map((top, index) => {
              const lineStyle = {
                top,
                width: plotWidth,
                height: CHART_SKELETON_GRID_LINE_THICKNESS,
                backgroundColor: gridColor,
              };
              return (
                <Box
                  key={`h-grid-${index}`}
                  style={[styles.absoluteLeft, lineStyle]}
                />
              );
            })}
            {Array.from(
              { length: CHART_SKELETON_VERTICAL_GRID_COUNT },
              (_, index) => {
                const left =
                  plotWidth > 0
                    ? (plotWidth * (index + 1)) /
                      (CHART_SKELETON_VERTICAL_GRID_COUNT + 1)
                    : 0;
                const lineStyle = {
                  left,
                  width: CHART_SKELETON_GRID_LINE_THICKNESS,
                  height: priceHeight,
                  backgroundColor: gridColor,
                };
                return (
                  <Box
                    key={`v-grid-${index}`}
                    style={[styles.absoluteTop, lineStyle]}
                  />
                );
              },
            )}
            {Array.from({ length: CHART_SKELETON_CANDLE_COUNT }, (_, index) => {
              const geometry = getChartSkeletonCandleGeometry(index);
              const slotLeft = index * slotWidth;
              const bodyLeft = slotLeft + (slotWidth - bodyWidth) / 2;
              const wickLeft =
                slotLeft + slotWidth / 2 - CHART_SKELETON_WICK_WIDTH / 2;
              const wickStyle = {
                left: wickLeft,
                top: geometry.wickTopRatio * priceHeight,
                width: CHART_SKELETON_WICK_WIDTH,
                height: geometry.wickHeightRatio * priceHeight,
                backgroundColor: skeletonColor,
              };
              const bodyStyle = {
                left: bodyLeft,
                top: geometry.bodyTopRatio * priceHeight,
                width: bodyWidth,
                height: geometry.bodyHeightRatio * priceHeight,
                backgroundColor: skeletonColor,
              };
              return (
                <React.Fragment key={`candle-${index}`}>
                  <Box
                    testID={`${testID}-wick-${index}`}
                    style={[styles.absolute, wickStyle]}
                  />
                  <Box
                    testID={`${testID}-candle-${index}`}
                    style={[styles.absolute, bodyStyle]}
                  />
                </React.Fragment>
              );
            })}
            {horizontalGridTops.map((top, index) => {
              const pillStyle = {
                top: Math.min(
                  Math.max(0, top - CHART_SKELETON_Y_PILL_HEIGHT / 2),
                  Math.max(0, priceHeight - CHART_SKELETON_Y_PILL_HEIGHT),
                ),
                width: CHART_SKELETON_Y_PILL_WIDTH,
                height: CHART_SKELETON_Y_PILL_HEIGHT,
                backgroundColor: skeletonColor,
              };
              return (
                <Box
                  key={`y-pill-${index}`}
                  testID={`${testID}-y-pill-${index}`}
                  style={[styles.absoluteRight, styles.pill, pillStyle]}
                />
              );
            })}
          </Box>

          <Box style={separatorStyle} />

          <Box style={volumePaneStyle}>
            {Array.from({ length: CHART_SKELETON_CANDLE_COUNT }, (_, index) => {
              const barStyle = {
                left: index * slotWidth + (slotWidth - bodyWidth) / 2,
                width: bodyWidth,
                height:
                  volumeHeight * CHART_SKELETON_VOLUME_HEIGHT_RATIOS[index],
                backgroundColor: skeletonColor,
              };
              return (
                <Box
                  key={`volume-${index}`}
                  testID={`${testID}-volume-${index}`}
                  style={[styles.absoluteBottom, barStyle]}
                />
              );
            })}
            <Box
              testID={`${testID}-volume-pill`}
              style={[styles.absoluteRight, styles.pill, volumePillStyle]}
            />
          </Box>

          <Box style={axisPaneStyle} twClassName="justify-center">
            {Array.from(
              { length: CHART_SKELETON_X_AXIS_LABEL_COUNT },
              (_, index) => {
                const segment =
                  plotWidth > 0
                    ? plotWidth / CHART_SKELETON_X_AXIS_LABEL_COUNT
                    : 0;
                const pillStyle = {
                  left: Math.max(
                    0,
                    segment * index +
                      segment / 2 -
                      CHART_SKELETON_X_PILL_WIDTH / 2,
                  ),
                  top: Math.max(
                    0,
                    axisHeight / 2 - CHART_SKELETON_X_PILL_HEIGHT / 2,
                  ),
                  width: CHART_SKELETON_X_PILL_WIDTH,
                  height: CHART_SKELETON_X_PILL_HEIGHT,
                  backgroundColor: skeletonColor,
                };
                return (
                  <Box
                    key={`x-pill-${index}`}
                    testID={`${testID}-x-pill-${index}`}
                    style={[styles.absolute, styles.pill, pillStyle]}
                  />
                );
              },
            )}
          </Box>
        </Animated.View>
      </Box>
    </Box>
  );
};

export default PerpsChartSkeleton;
