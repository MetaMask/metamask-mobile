import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import {
  PredictMarketChartPrototype,
  type PredictMarketChartPrototypeRef,
  type PredictMarketChartSeries,
} from './PredictMarketChartPrototype';

type DemoTimeframe = 'LIVE' | '1D' | '1W' | '1M' | '1Y';

const styles = StyleSheet.create({
  modeSelectors: {
    flexDirection: 'row',
    gap: 4,
  },
  timeframes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selector: {
    minWidth: 48,
    minHeight: 42,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  pressed: {
    opacity: 0.65,
  },
});

const TIMEFRAMES: readonly DemoTimeframe[] = ['LIVE', '1D', '1W', '1M', '1Y'];
const DEMO_END_TIME = Date.parse('2026-08-14T19:42:00.000Z');
const CHIEFS_VALUES = [
  0.73, 0.67, 0.7, 0.74, 0.69, 0.7, 0.68, 0.69, 0.7, 0.65, 0.62, 0.66, 0.59,
  0.65, 0.6, 0.66, 0.61,
];
const BILLS_VALUES = [
  0.66, 0.6, 0.63, 0.6, 0.51, 0.58, 0.49, 0.55, 0.5, 0.46, 0.47, 0.45, 0.41,
  0.46, 0.4, 0.47, 0.39,
];
const DRAW_VALUES = [
  0.16, 0.15, 0.16, 0.16, 0.14, 0.15, 0.13, 0.14, 0.12, 0.13, 0.14, 0.13, 0.12,
  0.13, 0.12, 0.13, 0.12,
];

const timeframeStep: Record<DemoTimeframe, number> = {
  LIVE: 60_000,
  '1D': 60 * 60_000,
  '1W': 8 * 60 * 60_000,
  '1M': 36 * 60 * 60_000,
  '1Y': 14 * 24 * 60 * 60_000,
};

const toPoints = (values: readonly number[], step: number, multiplier = 1) =>
  values.map((value, index) => ({
    time: DEMO_END_TIME - (values.length - index - 1) * step,
    value: value * multiplier,
  }));

const buildDemoSeries = (
  timeframe: DemoTimeframe,
  showDraw: boolean,
  colors: {
    chiefs: string;
    bills: string;
    draw: string;
  },
): PredictMarketChartSeries[] => {
  const step = timeframeStep[timeframe];
  const teamMultiplier = showDraw ? 0.88 : 1;
  return [
    {
      id: 'chiefs',
      label: 'Chiefs',
      color: colors.chiefs,
      data: toPoints(CHIEFS_VALUES, step, teamMultiplier),
    },
    {
      id: 'bills',
      label: 'Bills',
      color: colors.bills,
      data: toPoints(BILLS_VALUES, step, teamMultiplier),
    },
    ...(showDraw
      ? [
          {
            id: 'draw',
            label: 'Draw',
            color: colors.draw,
            data: toPoints(DRAW_VALUES, step),
          },
        ]
      : []),
  ];
};

const Selector = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selector,
        selected && { backgroundColor: colors.background.muted },
        pressed && styles.pressed,
      ]}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={selected ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Pressable>
  );
};

/** PROTOTYPE: remove or promote after the native SVG chart direction is chosen. */
export const PredictMarketChartPrototypeDemo = () => {
  const { colors } = useTheme();
  const chartRef = useRef<PredictMarketChartPrototypeRef>(null);
  const [timeframe, setTimeframe] = useState<DemoTimeframe>('LIVE');
  const [showDraw, setShowDraw] = useState(false);
  const series = useMemo(
    () =>
      buildDemoSeries(timeframe, showDraw, {
        chiefs: colors.error.default,
        bills: colors.primary.default,
        draw: colors.warning.default,
      }),
    [
      colors.error.default,
      colors.primary.default,
      colors.warning.default,
      showDraw,
      timeframe,
    ],
  );

  useEffect(() => {
    if (timeframe !== 'LIVE') return;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const chiefs = showDraw
        ? 0.54 + Math.sin(step * 0.8) * 0.025
        : 0.61 + Math.sin(step * 0.8) * 0.025;
      const draw = showDraw ? 0.12 + Math.cos(step * 0.55) * 0.008 : 0;
      const bills = 1 - chiefs - draw;

      chartRef.current?.appendTick({
        time: DEMO_END_TIME + step * 60_000,
        values: {
          chiefs,
          bills,
          ...(showDraw ? { draw } : {}),
        },
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showDraw, timeframe]);

  return (
    <Box twClassName="gap-4 rounded-2xl bg-default py-4">
      <Box twClassName="flex-row items-center justify-between px-2">
        <Box>
          <Text variant={TextVariant.HeadingSm}>Native chart prototype</Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            SVG paths, gradients, labels, and live ticks
          </Text>
        </Box>
        <View style={styles.modeSelectors}>
          <Selector
            label="2-way"
            selected={!showDraw}
            onPress={() => setShowDraw(false)}
          />
          <Selector
            label="3-way"
            selected={showDraw}
            onPress={() => setShowDraw(true)}
          />
        </View>
      </Box>

      <PredictMarketChartPrototype
        ref={chartRef}
        series={series}
        live={timeframe === 'LIVE'}
        height={250}
      />

      <View style={styles.timeframes}>
        {TIMEFRAMES.map((option) => (
          <Selector
            key={option}
            label={option}
            selected={option === timeframe}
            onPress={() => setTimeframe(option)}
          />
        ))}
      </View>
    </Box>
  );
};
