import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CampaignParticipantOutcomeStatus } from '../../../../../core/Engine/controllers/rewards-controller/types';

const BORDER_RADIUS = 12;
const BORDER_STROKE_WIDTH = 1.5;
const BORDER_SWEEP_DURATION_MS = 2500;
const BORDER_TRAIL_FRACTION = 0.35;
const GRADIENT_ID = 'campaign-outcome-banner-border-gradient';

// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const CAMPAIGN_OUTCOME_BANNER_BORDER_GRADIENT_START = '#D075FF';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const CAMPAIGN_OUTCOME_BANNER_BORDER_GRADIENT_END = '#FF5C16';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const campaignOutcomeBannerStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  borderSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

interface BorderPolylineSamples {
  xs: number[];
  ys: number[];
  cum: number[];
  n: number;
  perimeter: number;
}

const ARC_STEPS = 14;
const MAX_STRAIGHT_STEP = 5;

function pushDistinct(
  points: { x: number; y: number }[],
  x: number,
  y: number,
): void {
  const last = points[points.length - 1];
  if (!last || last.x !== x || last.y !== y) {
    points.push({ x, y });
  }
}

function lineSample(
  points: { x: number; y: number }[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(length / MAX_STRAIGHT_STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pushDistinct(points, x0 + t * (x1 - x0), y0 + t * (y1 - y0));
  }
}

function angleAt(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(cy - y, x - cx);
}

function arcSample(
  points: { x: number; y: number }[],
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): void {
  let delta = endAngle - startAngle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const arcEnd = startAngle + delta;
  for (let i = 1; i <= ARC_STEPS; i++) {
    const t = i / ARC_STEPS;
    const angle = startAngle + t * (arcEnd - startAngle);
    pushDistinct(
      points,
      cx + radius * Math.cos(angle),
      cy - radius * Math.sin(angle),
    );
  }
}

function buildRoundedRectBorderPolyline(
  width: number,
  height: number,
  borderRadius: number,
  strokeWidth: number,
): BorderPolylineSamples {
  const halfStroke = strokeWidth / 2;
  const radius = Math.max(borderRadius - halfStroke, 1e-6);
  const yBottom = height - halfStroke - radius;
  const yTop = halfStroke + radius;
  const xLeft = halfStroke;
  const xRight = width - halfStroke;
  const yTopLine = halfStroke;
  const yBottomLine = height - halfStroke;

  const points: { x: number; y: number }[] = [];

  pushDistinct(points, xLeft, yBottom);
  lineSample(points, xLeft, yBottom, xLeft, yTop);

  const topLeftCenterX = halfStroke + radius;
  const topLeftCenterY = halfStroke + radius;
  arcSample(
    points,
    topLeftCenterX,
    topLeftCenterY,
    radius,
    angleAt(xLeft, yTop, topLeftCenterX, topLeftCenterY),
    angleAt(xLeft + radius, yTopLine, topLeftCenterX, topLeftCenterY),
  );

  lineSample(points, xLeft + radius, yTopLine, xRight - radius, yTopLine);

  const topRightCenterX = width - halfStroke - radius;
  const topRightCenterY = halfStroke + radius;
  arcSample(
    points,
    topRightCenterX,
    topRightCenterY,
    radius,
    angleAt(xRight - radius, yTopLine, topRightCenterX, topRightCenterY),
    angleAt(xRight, yTop, topRightCenterX, topRightCenterY),
  );

  lineSample(points, xRight, yTop, xRight, yBottomLine - radius);

  const bottomRightCenterX = width - halfStroke - radius;
  const bottomRightCenterY = height - halfStroke - radius;
  arcSample(
    points,
    bottomRightCenterX,
    bottomRightCenterY,
    radius,
    angleAt(
      xRight,
      yBottomLine - radius,
      bottomRightCenterX,
      bottomRightCenterY,
    ),
    angleAt(
      xRight - radius,
      yBottomLine,
      bottomRightCenterX,
      bottomRightCenterY,
    ),
  );

  lineSample(points, xRight - radius, yBottomLine, xLeft + radius, yBottomLine);

  const bottomLeftCenterX = halfStroke + radius;
  const bottomLeftCenterY = height - halfStroke - radius;
  arcSample(
    points,
    bottomLeftCenterX,
    bottomLeftCenterY,
    radius,
    angleAt(xLeft + radius, yBottomLine, bottomLeftCenterX, bottomLeftCenterY),
    angleAt(xLeft, yBottomLine - radius, bottomLeftCenterX, bottomLeftCenterY),
  );

  lineSample(points, xLeft, yBottomLine - radius, xLeft, yBottom);

  const first = points[0];
  const last = points[points.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    pushDistinct(points, first.x, first.y);
  }

  const n = points.length;
  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  const cum = new Array<number>(n);
  cum[0] = 0;
  xs[0] = points[0].x;
  ys[0] = points[0].y;
  let accumulated = 0;
  for (let i = 1; i < n; i++) {
    xs[i] = points[i].x;
    ys[i] = points[i].y;
    accumulated += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    cum[i] = accumulated;
  }

  return {
    xs,
    ys,
    cum,
    n,
    perimeter: accumulated,
  };
}

function buildOpenBorderPathD(polyline: BorderPolylineSamples): string {
  const { xs, ys, n } = polyline;
  let path = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const isDuplicateClose = i === n - 1 && xs[i] === xs[0] && ys[i] === ys[0];
    if (isDuplicateClose) {
      break;
    }
    path += ` L ${xs[i]} ${ys[i]}`;
  }
  return path;
}

function pointAtLengthOnBorderPolyline(
  distance: number,
  xs: number[],
  ys: number[],
  cum: number[],
  n: number,
  perimeter: number,
): { x: number; y: number } {
  'worklet';
  let normalizedDistance = distance;
  while (normalizedDistance > perimeter) normalizedDistance -= perimeter;
  while (normalizedDistance < 0) normalizedDistance += perimeter;
  if (n < 2) {
    return { x: xs[0], y: ys[0] };
  }
  if (normalizedDistance <= 0) {
    return { x: xs[0], y: ys[0] };
  }
  if (normalizedDistance >= perimeter) {
    return { x: xs[n - 1], y: ys[n - 1] };
  }

  let low = 0;
  let high = n - 2;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cum[mid + 1] < normalizedDistance) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const start = cum[low];
  const end = cum[low + 1];
  const ratio =
    end - start === 0 ? 0 : (normalizedDistance - start) / (end - start);
  return {
    x: xs[low] + ratio * (xs[low + 1] - xs[low]),
    y: ys[low] + ratio * (ys[low + 1] - ys[low]),
  };
}

interface AnimatedSweepPathProps {
  polyline: BorderPolylineSamples;
  pathData: string;
  progress: SharedValue<number>;
}

const AnimatedSweepPath = React.memo<AnimatedSweepPathProps>(
  ({ polyline, pathData, progress }) => {
    const xs = polyline.xs as unknown as number[];
    const ys = polyline.ys as unknown as number[];
    const cum = polyline.cum as unknown as number[];
    const n = polyline.n;
    const perimeter = polyline.perimeter;

    function computeFrame(value: number) {
      'worklet';
      const trailLength = perimeter * BORDER_TRAIL_FRACTION;
      const gap = perimeter - trailLength;
      const dashOffset = perimeter * (1 - value);

      let tailDistance = dashOffset % perimeter;
      if (tailDistance < 0) tailDistance += perimeter;
      tailDistance = (perimeter - tailDistance) % perimeter;
      if (tailDistance < 0) tailDistance += perimeter;

      const tailPoint = pointAtLengthOnBorderPolyline(
        tailDistance,
        xs,
        ys,
        cum,
        n,
        perimeter,
      );
      const headPoint = pointAtLengthOnBorderPolyline(
        tailDistance + trailLength,
        xs,
        ys,
        cum,
        n,
        perimeter,
      );

      let x2 = headPoint.x;
      let y2 = headPoint.y;
      if (Math.hypot(x2 - tailPoint.x, y2 - tailPoint.y) < 0.75) {
        const aheadPoint = pointAtLengthOnBorderPolyline(
          tailDistance + Math.max(trailLength, 3),
          xs,
          ys,
          cum,
          n,
          perimeter,
        );
        x2 = aheadPoint.x;
        y2 = aheadPoint.y;
      }

      return {
        trailLength,
        gap,
        dashOffset,
        x1: tailPoint.x,
        y1: tailPoint.y,
        x2,
        y2,
      };
    }

    const pathAnimatedProps = useAnimatedProps(() => {
      const frame = computeFrame(progress.value);
      return {
        strokeDasharray: `${frame.trailLength},${frame.gap}`,
        strokeDashoffset: frame.dashOffset,
      };
    });

    const gradientAnimatedProps = useAnimatedProps(() => {
      const frame = computeFrame(progress.value);
      return {
        x1: frame.x1,
        y1: frame.y1,
        x2: frame.x2,
        y2: frame.y2,
      };
    });

    return (
      <>
        <Defs>
          <AnimatedLinearGradient
            id={GRADIENT_ID}
            gradientUnits="userSpaceOnUse"
            animatedProps={gradientAnimatedProps}
          >
            <Stop
              offset="0"
              stopColor={CAMPAIGN_OUTCOME_BANNER_BORDER_GRADIENT_START}
            />
            <Stop
              offset="1"
              stopColor={CAMPAIGN_OUTCOME_BANNER_BORDER_GRADIENT_END}
            />
          </AnimatedLinearGradient>
        </Defs>
        <AnimatedPath
          d={pathData}
          fill="none"
          stroke={`url(#${GRADIENT_ID})`}
          strokeWidth={BORDER_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          animatedProps={pathAnimatedProps}
        />
      </>
    );
  },
);

interface CampaignOutcomeBannerGradientBorderProps {
  width: number;
  height: number;
}

const CampaignOutcomeBannerGradientBorder =
  React.memo<CampaignOutcomeBannerGradientBorderProps>(({ width, height }) => {
    const progress = useSharedValue(0);

    const pathSpec = useMemo(() => {
      const polyline = buildRoundedRectBorderPolyline(
        width,
        height,
        BORDER_RADIUS,
        BORDER_STROKE_WIDTH,
      );
      return {
        polyline,
        pathData: buildOpenBorderPathD(polyline),
      };
    }, [width, height]);

    useEffect(() => {
      cancelAnimation(progress);
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, {
          duration: BORDER_SWEEP_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      );

      return () => {
        cancelAnimation(progress);
      };
    }, [pathSpec, progress]);

    return (
      <Svg
        width={width}
        height={height}
        style={campaignOutcomeBannerStyles.borderSvg}
        pointerEvents="none"
        testID="campaign-outcome-banner-gradient-border"
      >
        <AnimatedSweepPath
          polyline={pathSpec.polyline}
          pathData={pathSpec.pathData}
          progress={progress}
        />
      </Svg>
    );
  });

interface CampaignOutcomeBannerLayoutProps {
  title: string;
  description: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  showBorder?: boolean;
}

const CampaignOutcomeBannerLayout =
  React.memo<CampaignOutcomeBannerLayoutProps>(
    ({
      title,
      description,
      accessibilityLabel,
      onPress,
      showBorder = false,
    }) => {
      const [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
      } | null>(null);

      const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
      }, []);

      const bannerContent = (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="rounded-xl bg-muted p-4 gap-3"
        >
          <Box twClassName="flex-1 gap-0.5">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {description}
            </Text>
          </Box>
          {onPress ? (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          ) : null}
        </Box>
      );

      const content = showBorder ? (
        <View
          style={campaignOutcomeBannerStyles.container}
          onLayout={handleLayout}
          testID="campaign-outcome-banner-border-container"
        >
          {dimensions ? (
            <CampaignOutcomeBannerGradientBorder
              width={dimensions.width}
              height={dimensions.height}
            />
          ) : null}
          {bannerContent}
        </View>
      ) : (
        bannerContent
      );

      if (onPress && accessibilityLabel) {
        return (
          <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
            {content}
          </Pressable>
        );
      }

      return content;
    },
  );

export interface WinnerPendingBannerProps {
  onPress: () => void;
}

export const WinnerPendingBanner = React.memo<WinnerPendingBannerProps>(
  ({ onPress }) => (
    <CampaignOutcomeBannerLayout
      title={strings('rewards.campaign_outcome_banner.winner_pending.title')}
      description={strings(
        'rewards.campaign_outcome_banner.winner_pending.description',
      )}
      accessibilityLabel={strings(
        'rewards.campaign_outcome_banner.winner_pending.a11y',
      )}
      onPress={onPress}
      showBorder
    />
  ),
);

export const WinnerFinalizedBanner = React.memo(() => (
  <CampaignOutcomeBannerLayout
    title={strings('rewards.campaign_outcome_banner.winner_finalized.title')}
    description={strings(
      'rewards.campaign_outcome_banner.winner_finalized.description',
    )}
    showBorder
  />
));

export const ParticipantFinalizedBanner = React.memo(() => (
  <CampaignOutcomeBannerLayout
    title={strings(
      'rewards.campaign_outcome_banner.participant_finalized.title',
    )}
    description={strings(
      'rewards.campaign_outcome_banner.participant_finalized.description',
    )}
  />
));

export const ParticipantPendingBanner = React.memo(() => (
  <CampaignOutcomeBannerLayout
    title={strings('rewards.campaign_outcome_banner.participant_pending.title')}
    description={strings(
      'rewards.campaign_outcome_banner.participant_pending.description',
    )}
  />
));

export interface CampaignOutcomeBannerProps {
  outcomeStatus: CampaignParticipantOutcomeStatus;
  winnerVerificationCode: string | null | undefined;
  onWinnerPress: () => void;
}

export const CampaignOutcomeBanner = React.memo<CampaignOutcomeBannerProps>(
  ({ outcomeStatus, winnerVerificationCode, onWinnerPress }) => {
    const hasCode = Boolean(winnerVerificationCode);
    const isFinalized = outcomeStatus === 'finalized';
    if (hasCode && !isFinalized)
      return <WinnerPendingBanner onPress={onWinnerPress} />;
    if (hasCode && isFinalized) return <WinnerFinalizedBanner />;
    if (isFinalized) return <ParticipantFinalizedBanner />;
    return <ParticipantPendingBanner />;
  },
);
