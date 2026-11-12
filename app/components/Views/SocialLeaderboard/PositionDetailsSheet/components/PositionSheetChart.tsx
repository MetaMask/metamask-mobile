import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, Path } from 'react-native-svg';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  buildChartScale,
  buildLinePath,
  buildLinePoints,
  findNearestMarkerIndex,
  measurePolylineLength,
} from '../utils/chartGeometry';
import type { PositionSheetMarker } from '../hooks/usePositionSheetData';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export const POSITION_SHEET_CHART_HEIGHT = 280;
const CHART_INSET_TOP = 24;
const CHART_INSET_BOTTOM = 24;
const LINE_WIDTH = 2;
const CHART_HORIZONTAL_INSET = 16;
const MARKER_SIZE = 16;
const MARKER_HIT_SLOP = 16;
/** Space between the marker edge and the active ring. */
const MARKER_RING_GAP = 2;
const MARKER_RING_WIDTH = 2;
const MARKER_RING_SIZE =
  MARKER_SIZE + (MARKER_RING_GAP + MARKER_RING_WIDTH) * 2;
/** Space between the active ring's outer edge and the tooltip. */
const TOOLTIP_GAP = 8;
const TOOLTIP_EDGE_INSET = 8;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Full-height band between two x positions, for the scrub clip paths. */
const rectPath = (fromX: number, toX: number): string =>
  `M${fromX},0 H${Math.max(toX, fromX)} V${POSITION_SHEET_CHART_HEIGHT} H${fromX} Z`;

export interface PositionSheetChartProps {
  prices: TokenPrice[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isTrendPositive: boolean;
  markers: PositionSheetMarker[];
  timeAxisLabels: string[];
  lineProgress: SharedValue<number>;
  overlayStyle: React.ComponentProps<typeof Animated.View>['style'];
  /** Called with the scrubbed point, or `null` when the finger lifts. */
  onScrub: (point: TokenPrice | null) => void;
}

/**
 * The sheet's price line. Draws itself on open, then shows a marker per fill.
 * Scrubbing greys out the line past the finger and labels the nearest fill.
 */
const PositionSheetChart = ({
  prices,
  isLoading,
  isError = false,
  onRetry,
  isTrendPositive,
  markers,
  timeAxisLabels,
  lineProgress,
  overlayStyle,
  onScrub,
}: PositionSheetChartProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState(-1);
  const [tooltipFrame, setTooltipFrame] = useState<{
    id: string;
    width: number;
    height: number;
  } | null>(null);

  const values = useMemo(() => prices.map((point) => point[1]), [prices]);
  const scale = useMemo(
    () =>
      buildChartScale({
        values,
        frame: {
          width,
          height: POSITION_SHEET_CHART_HEIGHT,
          insetTop: CHART_INSET_TOP,
          insetBottom: CHART_INSET_BOTTOM,
        },
      }),
    [values, width],
  );

  const points = useMemo(
    () => (scale ? buildLinePoints(values, scale) : []),
    [values, scale],
  );
  const linePath = useMemo(() => buildLinePath(points), [points]);
  const lineLength = useMemo(() => measurePolylineLength(points), [points]);

  const lineAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - lineProgress.value),
  }));

  const markerXs = useMemo(
    () => (scale ? markers.map((marker) => scale.toX(marker.index)) : []),
    [markers, scale],
  );

  // The gesture is built once; its handlers read the latest data from here.
  const scrubStateRef = useRef({ scale, prices, onScrub });
  scrubStateRef.current = { scale, prices, onScrub };

  // Horizontal-only activation so a vertical drag still swipes the sheet.
  const scrubGesture = useMemo(() => {
    const updateScrub = (x: number) => {
      const state = scrubStateRef.current;
      if (!state.scale) return;
      const index = state.scale.indexAtX(x);
      setScrubIndex(index);
      state.onScrub(state.prices[index] ?? null);
    };
    return Gesture.Pan()
      .withTestId(PositionDetailsSheetSelectorsIDs.CHART_SCRUB)
      .runOnJS(true)
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .onStart((event) => updateScrub(event.x))
      .onUpdate((event) => updateScrub(event.x))
      .onFinalize(() => {
        setScrubIndex(-1);
        scrubStateRef.current.onScrub(null);
      });
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const lineColor = isTrendPositive
    ? colors.success.default
    : colors.error.default;
  const isScrubbing = scrubIndex >= 0 && points[scrubIndex] !== undefined;
  const scrubPoint = isScrubbing ? points[scrubIndex] : undefined;
  const scrubX = scrubPoint?.x ?? width;

  const activeMarkerIndex = scrubPoint
    ? findNearestMarkerIndex(markerXs, scrubPoint.x, MARKER_HIT_SLOP)
    : -1;
  const activeMarker = markers[activeMarkerIndex];
  const activeMarkerPoint = activeMarker
    ? points[activeMarker.index]
    : undefined;

  const renderTooltip = () => {
    if (!activeMarker || !activeMarkerPoint) return null;
    const measured = tooltipFrame?.id === activeMarker.id ? tooltipFrame : null;
    const tooltipWidth = measured?.width ?? 0;
    const tooltipHeight = measured?.height ?? 0;
    const unclampedLeft = activeMarkerPoint.x - tooltipWidth / 2;
    const left = Math.min(
      Math.max(unclampedLeft, TOOLTIP_EDGE_INSET),
      Math.max(width - tooltipWidth - TOOLTIP_EDGE_INSET, TOOLTIP_EDGE_INSET),
    );
    return (
      <View
        testID={PositionDetailsSheetSelectorsIDs.CHART_TOOLTIP}
        pointerEvents="none"
        onLayout={(event) => {
          const { width: nextWidth, height: nextHeight } =
            event.nativeEvent.layout;
          setTooltipFrame((current) =>
            current?.id === activeMarker.id &&
            current.width === nextWidth &&
            current.height === nextHeight
              ? current
              : { id: activeMarker.id, width: nextWidth, height: nextHeight },
          );
        }}
        style={[
          tw.style(
            'absolute rounded-lg border border-muted bg-background-subsection',
            measured ? 'opacity-100' : 'opacity-0',
            {
              paddingHorizontal: 10,
              paddingVertical: 8,
            },
          ),
          {
            top: Math.max(
              activeMarkerPoint.y -
                MARKER_RING_SIZE / 2 -
                TOOLTIP_GAP -
                tooltipHeight,
              0,
            ),
            left,
          },
        ]}
      >
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {activeMarker.actionLabel}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName={
            activeMarker.isValuePositive
              ? 'text-success-default'
              : 'text-error-default'
          }
        >
          {activeMarker.valueLabel}
        </Text>
      </View>
    );
  };

  const renderChartBody = () => {
    if (isError) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={{ height: POSITION_SHEET_CHART_HEIGHT }}
        >
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onRetry}
            testID={PositionDetailsSheetSelectorsIDs.CHART_RETRY}
          >
            {strings('offline_mode.try_again')}
          </Button>
        </Box>
      );
    }
    if (isLoading) {
      return (
        <View testID={PositionDetailsSheetSelectorsIDs.CHART_LOADING}>
          <SkeletonPlaceholder
            backgroundColor={colors.background.section}
            highlightColor={colors.background.subsection}
          >
            <SkeletonPlaceholder.Item
              width={Math.max(width - CHART_HORIZONTAL_INSET * 2, 0)}
              height={POSITION_SHEET_CHART_HEIGHT}
              marginLeft={CHART_HORIZONTAL_INSET}
              borderRadius={6}
            />
          </SkeletonPlaceholder>
        </View>
      );
    }
    if (!scale) return null;

    return (
      <>
        <Svg
          width={width}
          height={POSITION_SHEET_CHART_HEIGHT}
          testID={PositionDetailsSheetSelectorsIDs.CHART_LINE}
        >
          <Defs>
            <ClipPath id={`${clipId}-active`}>
              <Path d={rectPath(0, scrubX)} />
            </ClipPath>
            <ClipPath id={`${clipId}-inactive`}>
              <Path d={rectPath(scrubX, width)} />
            </ClipPath>
          </Defs>
          <AnimatedPath
            d={linePath}
            stroke={lineColor}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${lineLength} ${lineLength}`}
            animatedProps={lineAnimatedProps}
            clipPath={isScrubbing ? `url(#${clipId}-active)` : undefined}
          />
          {isScrubbing && scrubPoint ? (
            <G>
              <Path
                d={linePath}
                stroke={colors.icon.alternative}
                strokeWidth={LINE_WIDTH}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
                clipPath={`url(#${clipId}-inactive)`}
              />
              <Line
                x1={scrubPoint.x}
                x2={scrubPoint.x}
                y1={0}
                y2={POSITION_SHEET_CHART_HEIGHT}
                stroke={colors.icon.alternative}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Circle
                cx={scrubPoint.x}
                cy={scrubPoint.y}
                r={4}
                fill={lineColor}
                stroke={colors.background.default}
                strokeWidth={2}
              />
            </G>
          ) : null}
        </Svg>

        <Animated.View
          style={[tw.style('absolute inset-0'), overlayStyle]}
          pointerEvents="none"
        >
          {markers.map((marker, index) => {
            const point = points[marker.index];
            if (!point) return null;
            const isEnter = marker.intent === 'enter';
            const isActive = activeMarker?.id === marker.id;
            return (
              <View key={marker.id}>
                {isActive ? (
                  <View
                    pointerEvents="none"
                    testID={`${PositionDetailsSheetSelectorsIDs.CHART_MARKER}-ring-${marker.id}`}
                    style={[
                      tw.style('absolute rounded-full border-2'),
                      {
                        width: MARKER_RING_SIZE,
                        height: MARKER_RING_SIZE,
                        borderColor: isEnter
                          ? colors.success.default
                          : colors.error.default,
                        left: markerXs[index] - MARKER_RING_SIZE / 2,
                        top: point.y - MARKER_RING_SIZE / 2,
                      },
                    ]}
                  />
                ) : null}
                <View
                  testID={`${PositionDetailsSheetSelectorsIDs.CHART_MARKER}-${marker.id}`}
                  style={[
                    tw.style(
                      'absolute items-center justify-center rounded-full',
                      isEnter ? 'bg-success-default' : 'bg-error-default',
                    ),
                    {
                      width: MARKER_SIZE,
                      height: MARKER_SIZE,
                      left: markerXs[index] - MARKER_SIZE / 2,
                      top: point.y - MARKER_SIZE / 2,
                    },
                  ]}
                >
                  <Icon
                    name={isEnter ? IconName.Add : IconName.Minus}
                    size={IconSize.Xs}
                    color={IconColor.PrimaryInverse}
                  />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {renderTooltip()}
      </>
    );
  };

  return (
    <Box>
      <GestureDetector gesture={scrubGesture}>
        <View
          testID={PositionDetailsSheetSelectorsIDs.CHART}
          onLayout={handleLayout}
          style={{ height: POSITION_SHEET_CHART_HEIGHT }}
        >
          {width > 0 ? renderChartBody() : null}
        </View>
      </GestureDetector>
      {timeAxisLabels.length > 0 ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 pb-2"
        >
          {timeAxisLabels.map((label, index) => (
            <Text
              key={`${label}-${index}`}
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextMuted}
            >
              {label}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default PositionSheetChart;
