import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';
import type { SliceData, SliceKey } from '../../types';
import {
  SLICE_ORDER,
  MIN_SEGMENT_SWEEP_DEG,
  DONUT_GAP_DEG,
  DONUT_ROTATION_MS,
} from '../../constants';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';
import { breakdownDonutChartWrapperStyle } from './BreakdownDonutChart.styles';

interface Props {
  slices: Record<SliceKey, SliceData>;
  selectedSlice: SliceKey | 'all';
  onSlicePress: (key: SliceKey) => void;
  size?: number;
  radius?: number;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 240;
const DEFAULT_RADIUS = 80;
const DEFAULT_STROKE = 14;

function polarToXY(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Single arc along the mid-radius of the donut ring (for stroked + round caps). */
function arcStrokePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArcFlag = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

interface SegmentData {
  key: SliceKey;
  color: string;
  startDeg: number;
  endDeg: number;
}

function buildSegments(
  slices: Record<SliceKey, SliceData>,
  gap: number,
): SegmentData[] {
  const eligible = SLICE_ORDER.filter(
    (k) =>
      slices[k].status !== 'ineligible' &&
      slices[k].status !== 'error' &&
      slices[k].valueFiat > 0,
  );

  if (eligible.length === 0) return [];

  const gapTotal = gap * eligible.length;
  const availableDeg = 360 - gapTotal;
  const total = eligible.reduce((s, k) => s + slices[k].valueFiat, 0);

  const segments: SegmentData[] = [];
  let cursor = 0;

  for (let i = 0; i < eligible.length; i++) {
    const key = eligible[i];
    const isLast = i === eligible.length - 1;
    let sweep: number;

    if (isLast) {
      const used = segments.reduce((s, sg) => s + (sg.endDeg - sg.startDeg), 0);
      sweep = availableDeg - used;
    } else {
      sweep = Math.max(
        MIN_SEGMENT_SWEEP_DEG,
        total > 0 ? (slices[key].valueFiat / total) * availableDeg : 0,
      );
    }

    segments.push({
      key,
      color: slices[key].color,
      startDeg: cursor,
      endDeg: cursor + sweep,
    });
    cursor += sweep + gap;
  }

  return segments;
}

const BreakdownDonutChart: React.FC<Props> = ({
  slices,
  selectedSlice,
  onSlicePress,
  size = DEFAULT_SIZE,
  radius = DEFAULT_RADIUS,
  strokeWidth = DEFAULT_STROKE,
}) => {
  const { colors } = useTheme();
  const emptyRingStroke = useMemo(
    () => colors.border.default,
    [colors.border.default],
  );
  const dimmedSegmentStroke = useMemo(
    () => colors.background.section,
    [colors.background.section],
  );

  const center = size / 2;
  const segments = useMemo(() => buildSegments(slices, DONUT_GAP_DEG), [slices]);

  const rotationDeg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let target = 0;
    if (selectedSlice !== 'all') {
      const seg = segments.find((s) => s.key === selectedSlice);
      if (seg) {
        const midDeg = (seg.startDeg + seg.endDeg) / 2;
        target = -midDeg;
      }
    }
    Animated.timing(rotationDeg, {
      toValue: target,
      duration: DONUT_ROTATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedSlice, segments, rotationDeg]);

  const spin = rotationDeg.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  const handlePress = useCallback(
    (key: SliceKey) => {
      onSlicePress(key);
    },
    [onSlicePress],
  );

  return (
    <View testID={BalanceBreakdownTestIds.DONUT_CHART}>
      <Animated.View style={breakdownDonutChartWrapperStyle(size, spin)}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.length === 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={emptyRingStroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ) : (
            <G>
              {segments.map((seg) => {
                const d = arcStrokePath(
                  center,
                  center,
                  radius,
                  seg.startDeg,
                  seg.endDeg,
                );
                const strokeColor =
                  selectedSlice === 'all' || selectedSlice === seg.key
                    ? seg.color
                    : dimmedSegmentStroke;
                return (
                  <Path
                    key={seg.key}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onPress={() => handlePress(seg.key)}
                    accessibilityLabel={`${slices[seg.key].label} balance segment`}
                  />
                );
              })}
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

export default BreakdownDonutChart;
