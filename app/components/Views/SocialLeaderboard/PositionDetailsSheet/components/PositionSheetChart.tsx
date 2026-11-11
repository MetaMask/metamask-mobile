import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, Path } from 'react-native-svg';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { useTheme } from '../../../../../util/theme';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  buildChartScale,
  buildLinePath,
  buildLinePoints,
  findNearestMarkerIndex,
  measurePolylineLength,
} from '../utils/chartGeometry';
import {
  CHART_SCRUB_ACTIVATION,
  CHART_VERTICAL_RELEASE,
} from '../utils/sheetGesture';
import { useSheetChartFrame } from './sheetChartFrame';
import type { PositionSheetMarker } from '../hooks/usePositionSheetData';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

/** Floor so a short screen still shows a readable line. */
const CHART_MIN_HEIGHT = 160;
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
const rectPath = (fromX: number, toX: number, height: number): string =>
  `M${fromX},0 H${Math.max(toX, fromX)} V${height} H${fromX} Z`;

export interface PositionSheetChartProps {
  prices: TokenPrice[];
  isLoading: boolean;
  isTrendPositive: boolean;
  markers: PositionSheetMarker[];
  timeAxisLabels: string[];
  lineProgress: SharedValue<number>;
  overlayStyle: React.ComponentProps<typeof Animated.View>['style'];
  /** Called with the scrubbed point, or `null` when the finger lifts. */
  onScrub: (point: TokenPrice | null) => void;
  /** Fires once the chart's box has stopped changing size. */
  onFrameReady?: () => void;
  /** The line stays hidden until the sheet's open animation finishes. */
  isSheetOpen: boolean;
}

/**
 * The sheet's price line. Draws itself on open, then shows a marker per fill.
 * Scrubbing greys out the line past the finger and labels the nearest fill.
 */
const PositionSheetChart = ({
  prices,
  isLoading,
  isTrendPositive,
  markers,
  timeAxisLabels,
  lineProgress,
  overlayStyle,
  onScrub,
  onFrameReady,
  isSheetOpen,
}: PositionSheetChartProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const onFrameReadyRef = useRef(onFrameReady);
  onFrameReadyRef.current = onFrameReady;
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
          height,
          insetTop: CHART_INSET_TOP,
          insetBottom: CHART_INSET_BOTTOM,
        },
      }),
    [values, width, height],
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

  const chartFrame = useSheetChartFrame();
  const chartRef = useRef<View>(null);

  const publishFrame = useCallback(() => {
    const chartNode = chartRef.current;
    const hostNode = chartFrame?.hostRef.current;
    if (!chartFrame || !chartNode || !hostNode) return;
    chartNode.measureInWindow((_x, y, _width, height) => {
      hostNode.measureInWindow((_hostX, hostY) => {
        chartFrame.contentY.value = y - hostY + chartFrame.scrollY.value;
        chartFrame.height.value = height;
      });
    });
  }, [chartFrame]);

  // The gesture is built once; its handlers read the latest data from here.
  const scrubStateRef = useRef({ scale, prices, onScrub });
  scrubStateRef.current = { scale, prices, onScrub };

  // A sideways lean scrubs and stays a scrub. A straight vertical swipe
  // fails here so the list can scroll, or the sheet can dismiss.
  const scrubGesture = useMemo(() => {
    const updateScrub = (x: number) => {
      const state = scrubStateRef.current;
      if (!state.scale) return;
      const index = state.scale.indexAtX(x);
      setScrubIndex(index);
      state.onScrub(state.prices[index] ?? null);
    };
    const pan = Gesture.Pan()
      .withTestId(PositionDetailsSheetSelectorsIDs.CHART_SCRUB)
      .runOnJS(true)
      .activeOffsetX([-CHART_SCRUB_ACTIVATION, CHART_SCRUB_ACTIVATION])
      .failOffsetY([-CHART_VERTICAL_RELEASE, CHART_VERTICAL_RELEASE])
      .onStart((event) => updateScrub(event.x))
      .onUpdate((event) => updateScrub(event.x))
      .onFinalize(() => {
        setScrubIndex(-1);
        scrubStateRef.current.onScrub(null);
      });
    const gestures = chartFrame?.gestures ?? [];
    return gestures.length > 0 ? pan.blocksExternalGesture(...gestures) : pan;
  }, [chartFrame?.gestures]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      publishFrame();
      if (isFrameReady) return;
      const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
      if (nextWidth <= 0 || nextHeight <= 0) return;
      setWidth((current) => (current === nextWidth ? current : nextWidth));
      setHeight((current) => (current === nextHeight ? current : nextHeight));
    },
    [isFrameReady, publishFrame],
  );

  // The box can settle across a couple of layouts as the sheet measures
  // itself. Wait until the sheet has opened and one frame passes without a
  // new size, then draw once.
  useEffect(() => {
    if (!isSheetOpen || isFrameReady || width <= 0 || height <= 0) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      setIsFrameReady(true);
      onFrameReadyRef.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [height, isFrameReady, isSheetOpen, width]);

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
    if (isLoading) {
      // Stay empty until prices land, so the line draws in once with no
      // skeleton → blank → line sequence.
      return <View testID={PositionDetailsSheetSelectorsIDs.CHART_LOADING} />;
    }
    if (!scale || !isFrameReady) return null;

    return (
      <>
        <Svg
          width={width}
          height={height}
          testID={PositionDetailsSheetSelectorsIDs.CHART_LINE}
        >
          <Defs>
            <ClipPath id={`${clipId}-active`}>
              <Path d={rectPath(0, scrubX, height)} />
            </ClipPath>
            <ClipPath id={`${clipId}-inactive`}>
              <Path d={rectPath(scrubX, width, height)} />
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
            strokeDashoffset={lineLength}
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
                y2={height}
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
    <Box twClassName="flex-1">
      <GestureDetector gesture={scrubGesture}>
        <View
          ref={chartRef}
          testID={PositionDetailsSheetSelectorsIDs.CHART}
          onLayout={handleLayout}
          style={[tw.style('flex-1'), { minHeight: CHART_MIN_HEIGHT }]}
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

export default React.memo(PositionSheetChart);
