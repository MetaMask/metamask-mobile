import React from 'react';
import {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../util/theme';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { AvatarTradeMarker } from '../../Charts/socialMarkers/mapFollowingPositionsToAvatarMarkers';

/** Avatar circle diameter (logical px). */
const AVATAR_DIAMETER = 22;
const AVATAR_RADIUS = AVATAR_DIAMETER / 2;
/** White/background ring around the avatar so it reads off the line. */
const RING_WIDTH = 1.5;
/** Buy/sell badge radius, offset to the lower-right of the avatar. */
const BADGE_RADIUS = 6;
const BADGE_OFFSET = AVATAR_RADIUS * 0.72;

/** Injected by `AreaChart` when rendered as a decorator child. */
interface InjectedScale {
  x: (value: number) => number;
  y: (value: number) => number;
}

export interface SocialAvatarMarkersProps extends Partial<InjectedScale> {
  markers: readonly AvatarTradeMarker[];
  /** Full price series (same array passed to `AreaChart`). */
  prices: readonly TokenPrice[];
  /** When true the x-axis is time-based, so x() expects a timestamp. */
  isTimeBased: boolean;
}

const initialOf = (name: string): string =>
  (name?.trim()?.[0] ?? '?').toUpperCase();

/**
 * Renders follower avatar markers on the line chart at each trade's time and
 * price, with a small buy (green) / sell (red) badge. Rendered as an
 * `AreaChart` decorator child so `x`/`y` scale functions are injected.
 */
const SocialAvatarMarkers = ({
  markers,
  prices,
  isTimeBased,
  x,
  y,
}: SocialAvatarMarkersProps) => {
  const { colors } = useTheme();

  if (!x || !y || markers.length === 0) return null;

  return (
    <G key="social-avatar-markers">
      {markers.map((marker) => {
        const price = prices[marker.index];
        if (!price) return null;
        const cx = isTimeBased ? x(Number(price[0])) : x(marker.index);
        const cy = y(price[1]);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

        const isBuy = marker.intent === 'enter';
        const badgeColor = isBuy
          ? colors.success.default
          : colors.error.default;
        const clipId = `social-marker-clip-${marker.id}`;

        return (
          <G
            key={marker.id}
            x={cx}
            y={cy}
            testID={`social-marker-${marker.id}`}
          >
            {/* Ring */}
            <Circle
              r={AVATAR_RADIUS + RING_WIDTH}
              fill={colors.background.default}
            />
            {marker.avatarUrl ? (
              <>
                <Defs>
                  <ClipPath id={clipId}>
                    <Circle r={AVATAR_RADIUS} />
                  </ClipPath>
                </Defs>
                <SvgImage
                  x={-AVATAR_RADIUS}
                  y={-AVATAR_RADIUS}
                  width={AVATAR_DIAMETER}
                  height={AVATAR_DIAMETER}
                  href={{ uri: marker.avatarUrl }}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                />
              </>
            ) : (
              <>
                <Circle r={AVATAR_RADIUS} fill={colors.primary.muted} />
                <SvgText
                  fill={colors.text.default}
                  fontSize={AVATAR_RADIUS}
                  fontWeight="600"
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {initialOf(marker.traderName)}
                </SvgText>
              </>
            )}
            {/* Buy/sell badge */}
            <Circle
              cx={BADGE_OFFSET}
              cy={BADGE_OFFSET}
              r={BADGE_RADIUS}
              fill={badgeColor}
              stroke={colors.background.default}
              strokeWidth={1}
            />
            <SvgText
              x={BADGE_OFFSET}
              y={BADGE_OFFSET}
              fill={colors.background.default}
              fontSize={BADGE_RADIUS * 1.6}
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {isBuy ? '+' : '\u2212'}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

export default SocialAvatarMarkers;
