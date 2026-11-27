import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RollingNumber } from './RollingNumber';
import { PositionBadge } from './components';
import { useTheme } from '../../../../util/theme';
import { usePrototypeMotion } from './usePrototypeMotion';
import { ChatsCircleIcon } from './assets/icons';

const styles = StyleSheet.create({
  dotBox: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  dotCore: { width: 6, height: 6, borderRadius: 3 },
  pillRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chart: { overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, top: 0 },
});

export type FeedTone = 'success' | 'error';

type PhosphorSvg = FC<SvgProps & { name: string }>;

/**
 * One of the Phosphor icons designated in Figma. The SVGs use `currentColor`,
 * so `color` takes a design-system token value from `useTheme`.
 */
export const PhosphorIcon = ({
  icon: Icon,
  label,
  size = 16,
  color,
}: {
  icon: PhosphorSvg;
  /** Used as the SVG name, which the jest mock and a11y tooling read. */
  label: string;
  size?: number;
  color: string;
}) => <Icon name={label} width={size} height={size} color={color} />;

/** `+0.01% above target` / `−8.25% below target`, from a price and its target. */
export const targetDeltaLabel = (price: number, target: number) => {
  if (!target) return 'At target';
  const pct = ((price - target) / target) * 100;
  const rounded = Math.abs(pct).toFixed(2);
  if (Number(rounded) === 0) return 'At target';
  return `${pct > 0 ? '+' : '−'}${rounded}% ${pct > 0 ? 'above' : 'below'} target`;
};

/** Card surface from Figma: elevated fill, muted hairline, 20px corners. */
export const FeedCardSurface = ({
  children,
  onPress,
  width,
  height,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  width?: number;
  height?: number;
  testID?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          'overflow-hidden rounded-[20px] border-2 border-muted bg-elevated1 p-4',
          !width && 'self-stretch',
        ),
        width ? { width } : null,
        height ? { height } : null,
        pressed ? { transform: [{ scale: 0.985 }], opacity: 0.92 } : null,
      ]}
    >
      {children}
    </Pressable>
  );
};

/** Live status dot: a solid core in a soft halo, both inside a 12px box so it lines up with the text. */
export const PulseDot = ({ tone }: { tone: FeedTone }) => {
  const { colors } = useTheme();
  const { shouldAnimate } = usePrototypeMotion();
  const halo = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!shouldAnimate) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [halo, shouldAnimate]);
  const palette = tone === 'error' ? colors.error : colors.success;
  return (
    <View testID={`pulse-dot-${tone}`} style={styles.dotBox}>
      <Animated.View
        style={[
          styles.dotHalo,
          { backgroundColor: palette.muted, opacity: halo },
        ]}
      />
      <View style={[styles.dotCore, { backgroundColor: palette.default }]} />
    </View>
  );
};

export interface FeedStatus {
  /** Clock or day. Digits animate as it changes. */
  label: string;
  /** Live dot and label colour. Omit for a plain, alternative-colour label. */
  tone?: FeedTone;
  /** League or similar, after the bullet: `• NFL`. */
  suffix?: string;
}

/** Dot, clock, then `• League`, the status line under every feed card title. */
export const FeedStatusLine = ({ status }: { status: FeedStatus }) => (
  <Box twClassName="h-4 flex-row items-center gap-1.5">
    {status.tone ? <PulseDot tone={status.tone} /> : null}
    <RollingNumber
      animated={Boolean(status.tone)}
      value={status.label}
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Bold}
      color={
        status.tone === 'error'
          ? TextColor.ErrorDefault
          : status.tone === 'success'
            ? TextColor.SuccessDefault
            : TextColor.TextAlternative
      }
    />
    {status.suffix ? (
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextAlternative}
      >
        {`• ${status.suffix}`}
      </Text>
    ) : null}
  </Box>
);

/**
 * Outlined price pill from Figma. The digits tick through
 * `RollingNumber` as the price moves.
 */
export const OddsPill = ({
  price,
  prefix,
  tone,
  onPress,
  accessibilityLabel,
  testID,
  isFixedWidth = false,
  badge = 0,
}: {
  price: number;
  /** Text before the number: `Up · `. */
  prefix?: string;
  tone: FeedTone;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  /** 64px for outcome rows. Otherwise the pill fills its row. */
  isFixedWidth?: boolean;
  /** Contracts held in this outcome. Shows the count badge when above 0. */
  badge?: number;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const textColor =
    tone === 'error' ? TextColor.ErrorDefault : TextColor.SuccessDefault;
  return (
    <Box twClassName={isFixedWidth ? 'w-16' : 'flex-1'}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        hitSlop={4}
        style={({ pressed }) =>
          tw.style(
            'h-10 items-center justify-center overflow-hidden rounded-full border-2',
            tone === 'error' ? 'border-error-muted' : 'border-success-muted',
            'w-full',
            pressed && 'bg-pressed',
          )
        }
      >
        <Box twClassName="flex-row items-center">
          {prefix ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={textColor}
            >
              {prefix}
            </Text>
          ) : null}
          <RollingNumber
            value={`${price}%`}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={textColor}
          />
        </Box>
      </Pressable>
      <PositionBadge count={badge} />
    </Box>
  );
};

const clampShare = (value: number) => Math.max(4, Math.min(100, value));

/**
 * The odds line under an outcome name. Its length is the outcome's price and
 * it glides to each new price, so a market's movement reads at a glance.
 */
export const OutcomeBar = ({
  value,
  color,
}: {
  value: number;
  color: string;
}) => {
  const tw = useTailwind();
  const { shouldAnimate } = usePrototypeMotion();
  const share = useRef(new Animated.Value(clampShare(value))).current;
  useEffect(() => {
    if (!shouldAnimate) {
      share.setValue(clampShare(value));
      return;
    }
    Animated.timing(share, {
      toValue: clampShare(value),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      // Width is a layout property, so this one stays on the JS driver.
      useNativeDriver: false,
    }).start();
  }, [share, shouldAnimate, value]);
  const width = share.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  return (
    <Animated.View
      testID="outcome-bar"
      style={[
        tw.style('h-[3px] rounded-full'),
        { width, backgroundColor: color },
      ]}
    />
  );
};

/** Thumb, name over share bar, optional score, price pill. One outcome of a market. */
export const FeedOutcomeRow = ({
  thumb,
  name,
  nameVariant = TextVariant.BodyMd,
  share,
  barColor,
  score,
  pill,
}: {
  thumb: React.ReactNode;
  name: string;
  nameVariant?: TextVariant;
  share: number;
  barColor: string;
  score?: number;
  pill: React.ReactNode;
}) => (
  <Box twClassName="h-10 flex-row items-center gap-3">
    {thumb}
    <Box twClassName="min-w-0 flex-1 gap-1">
      <Text
        variant={nameVariant}
        fontWeight={FontWeight.Regular}
        numberOfLines={1}
      >
        {name}
      </Text>
      <OutcomeBar value={share} color={barColor} />
    </Box>
    {score !== undefined ? (
      <RollingNumber
        value={String(score)}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
      />
    ) : null}
    {pill}
  </Box>
);

/** `$1.0M vol.` on the left, comment count on the right. Both tick live. */
export const FeedFooter = ({
  volume,
  comments,
  onCommentsPress,
}: {
  volume: string;
  comments: number;
  onCommentsPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Box twClassName="h-5 flex-row items-center justify-between">
      <Box twClassName="flex-row items-center">
        <RollingNumber
          value={volume}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {' vol.'}
        </Text>
      </Box>
      <Pressable
        testID="feed-comments-button"
        accessibilityRole="button"
        accessibilityLabel={`${comments} comments`}
        onPress={onCommentsPress}
        hitSlop={12}
      >
        <Box twClassName="flex-row items-center gap-1">
          <PhosphorIcon
            icon={ChatsCircleIcon}
            label="chats-circle"
            size={16}
            color={colors.icon.alternative}
          />
          <RollingNumber
            value={String(comments)}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          />
        </Box>
      </Pressable>
    </Box>
  );
};

const CHART_PAD = 12;
const CHART_DOT = 4.5;
const CHART_PILL_HEIGHT = 24;
/** Share of the gap the chart's y-domain closes per tick when it narrows. */
const DOMAIN_EASE = 0.12;

interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Smooths jitter with a three-point average. The first and last points stay
 * put, so the dot always sits on the real live price.
 */
export const smoothValues = (values: number[]) =>
  values.map((value, index) =>
    index === 0 || index === values.length - 1
      ? value
      : (values[index - 1] + value + values[index + 1]) / 3,
  );

/** A Catmull-Rom curve through the points, as cubic Bézier segments. */
export const smoothPath = (points: ChartPoint[]) => {
  if (points.length < 2) return '';
  const fmt = (value: number) => value.toFixed(1);
  let path = `M${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const before = points[index - 1] ?? points[index];
    const from = points[index];
    const to = points[index + 1];
    const after = points[index + 2] ?? to;
    path +=
      ` C${fmt(from.x + (to.x - before.x) / 6)} ${fmt(from.y + (to.y - before.y) / 6)}` +
      ` ${fmt(to.x - (after.x - from.x) / 6)} ${fmt(to.y - (after.y - from.y) / 6)}` +
      ` ${fmt(to.x)} ${fmt(to.y)}`;
  }
  return path;
};

let chartIds = 0;

/**
 * Live price against its target: dashed target line with the move label in a
 * pill on it, a smoothed price line that fades in from the left over a soft
 * fill, and a dot at the live price. Colour follows which side of the target
 * the price is on.
 */
export const FeedLiveChart = ({
  values,
  target,
  height = 72,
}: {
  values: number[];
  target: number;
  height?: number;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { shouldAnimate, tickMs } = usePrototypeMotion();
  const [width, setWidth] = useState(0);
  const shift = useRef(new Animated.Value(0)).current;
  const gradientId = useRef(`feed-chart-${chartIds++}`).current;
  const last = values[values.length - 1] ?? target;
  const tone: FeedTone = last >= target ? 'success' : 'error';
  const lineColor =
    tone === 'success' ? colors.success.default : colors.error.default;
  // The y-domain widens at once but narrows slowly, so points already on the
  // chart hold still while it scrolls. A new target (new round) resets it.
  const domainRef = useRef<{ target: number; min: number; max: number } | null>(
    null,
  );
  const { min, max } = useMemo(() => {
    const rawMin = Math.min(target, ...values);
    const rawMax = Math.max(target, ...values);
    const pad = (rawMax - rawMin || 1) * 0.1;
    const wantMin = rawMin - pad;
    const wantMax = rawMax + pad;
    const held = domainRef.current;
    const next =
      held && held.target === target
        ? {
            target,
            min:
              wantMin < held.min
                ? wantMin
                : held.min + (wantMin - held.min) * DOMAIN_EASE,
            max:
              wantMax > held.max
                ? wantMax
                : held.max + (wantMax - held.max) * DOMAIN_EASE,
          }
        : { target, min: wantMin, max: wantMax };
    domainRef.current = next;
    return next;
    // `values` changes identity every render; the live price is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last, target, values.length]);
  const range = max - min || 1;
  const plotHeight = height - CHART_PAD * 2;
  const toY = (value: number) =>
    height - CHART_PAD - ((value - min) / range) * plotHeight;
  const plotWidth = Math.max(24, width - CHART_DOT * 2 - 2);
  const step = plotWidth / Math.max(1, values.length - 1);
  const targetY = toY(target);
  // Each tick the window slides one point left. Start the line one step to
  // the right and glide it home, so the chart scrolls instead of stepping.
  useEffect(() => {
    if (!shouldAnimate || step <= 0 || width === 0) return;
    shift.setValue(step);
    Animated.timing(shift, {
      toValue: 0,
      duration: tickMs,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [last, shift, shouldAnimate, step, tickMs, width]);
  const points = smoothValues(values).map((value, index) => ({
    x: index * step,
    y: toY(value),
  }));
  const line = smoothPath(points);
  const area = `${line} L${plotWidth.toFixed(1)} ${height} L0 ${height} Z`;
  const pillTop = Math.min(
    height - CHART_PILL_HEIGHT,
    Math.max(0, targetY - CHART_PILL_HEIGHT / 2),
  );
  return (
    <View
      testID="feed-live-chart"
      style={[styles.chart, { height }]}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={styles.layer}>
            <Line
              x1={0}
              x2={width}
              y1={targetY}
              y2={targetY}
              stroke={colors.icon.alternative}
              strokeDasharray="3,4"
              strokeWidth={1.5}
              opacity={0.5}
            />
          </Svg>
          <Animated.View
            style={[styles.layer, { transform: [{ translateX: shift }] }]}
          >
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient
                  id={`${gradientId}-line`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={0}
                  x2={plotWidth}
                  y2={0}
                >
                  <Stop offset="0" stopColor={lineColor} stopOpacity={0.15} />
                  <Stop offset="1" stopColor={lineColor} stopOpacity={1} />
                </LinearGradient>
                <LinearGradient
                  id={`${gradientId}-area`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={height}
                >
                  <Stop offset="0" stopColor={lineColor} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill={`url(#${gradientId}-area)`} />
              <Path
                d={line}
                stroke={`url(#${gradientId}-line)`}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Circle
                cx={plotWidth}
                cy={toY(last)}
                r={CHART_DOT * 2}
                fill={lineColor}
                opacity={0.18}
              />
              <Circle
                cx={plotWidth}
                cy={toY(last)}
                r={CHART_DOT}
                fill={lineColor}
              />
            </Svg>
          </Animated.View>
          <View pointerEvents="none" style={[styles.pillRow, { top: pillTop }]}>
            <View
              style={tw.style(
                'h-6 items-center justify-center rounded-full border-2 border-muted bg-elevated1 px-3',
              )}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Bold}
                color={
                  tone === 'success'
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
              >
                {targetDeltaLabel(last, target)}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
};
