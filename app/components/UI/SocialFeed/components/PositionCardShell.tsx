import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';

/**
 * Horizontal bleed that cancels the content padding, so a full-width rule can
 * reach the card's borders. Kept next to the padding it negates -- the two have
 * to move together, and they live in different components.
 */
export const POSITION_CARD_BLEED_TW_CLASS = '-mx-3';

/**
 * Wash hue. Follows the position's P&L on both open and closed cards. Neutral
 * means the row reported no P&L, so the card stays a plain hairline.
 */
export type PositionCardTone = 'neutral' | 'positive' | 'negative';

/**
 * CSS `linear-gradient` angles from the Figma frames. 0° points up. Open cards
 * are ~214°, closed cards ~203°, and the compact no-comment variants sit a
 * little further round, ~192°. The tint sits on the top edge, right of center,
 * and is gone 70% of the way toward the bottom.
 */
const OPEN_WASH_ANGLE = 214.2;
const CLOSED_WASH_ANGLE = 203.13;
const LIVE_COMPACT_WASH_ANGLE = 192.41;
const CLOSED_COMPACT_WASH_ANGLE = 192.76;
const GRADIENT_LOCATIONS = [0, 0.7];

/** Where a unit vector from the box center hits the edge. */
const pointOnBoxEdge = (vx: number, vy: number) => {
  const tx = vx > 0 ? 0.5 / vx : vx < 0 ? -0.5 / vx : Number.POSITIVE_INFINITY;
  const ty = vy > 0 ? 0.5 / vy : vy < 0 ? -0.5 / vy : Number.POSITIVE_INFINITY;
  const distance = Math.min(tx, ty);
  return { x: 0.5 + vx * distance, y: 0.5 + vy * distance };
};

/** `start` is the 0% tint. `end` is the far side the wash travels toward. */
const washLine = (cssDegrees: number) => {
  const radians = (cssDegrees * Math.PI) / 180;
  const towardEndX = Math.sin(radians);
  const towardEndY = -Math.cos(radians);
  return {
    start: pointOnBoxEdge(-towardEndX, -towardEndY),
    end: pointOnBoxEdge(towardEndX, towardEndY),
  };
};

const OPEN_WASH = washLine(OPEN_WASH_ANGLE);
const CLOSED_WASH = washLine(CLOSED_WASH_ANGLE);
const LIVE_COMPACT_WASH = washLine(LIVE_COMPACT_WASH_ANGLE);
const CLOSED_COMPACT_WASH = washLine(CLOSED_COMPACT_WASH_ANGLE);

const washLineFor = (emphasizeBorder: boolean, compact: boolean) => {
  if (compact) {
    return emphasizeBorder ? CLOSED_COMPACT_WASH : LIVE_COMPACT_WASH;
  }
  return emphasizeBorder ? CLOSED_WASH : OPEN_WASH;
};

const styles = StyleSheet.create({
  // The gradient view is rectangular. On the new architecture its layer is not
  // masked by an ancestor's overflow, so the square corners paint past the
  // card's radius. This wrapper is a plain view, which does clip. It uses
  // `absoluteFill` — `absoluteFillObject` is not exported here, and spreading
  // that missing value leaves the wrapper in the content flow, which collapses
  // the wash and opens the card's gap above the header.
  clip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  surface: StyleSheet.absoluteFill,
});

/**
 * `success.muted` / `error.muted` are already a 15% tint. The far stop is the
 * same hue at alpha 0. Fading to `transparent` would fade toward black.
 */
const washColors = (muted: string, base: string): [string, string] => [
  muted,
  `${base}00`,
];

const borderClassName = (
  tone: PositionCardTone,
  emphasizeBorder: boolean,
): string => {
  if (emphasizeBorder && tone === 'positive') {
    return 'border-2 border-success-default';
  }
  if (emphasizeBorder && tone === 'negative') {
    return 'border-2 border-error-default';
  }
  return 'border border-muted';
};

export interface PositionCardShellProps {
  tone?: PositionCardTone;
  /**
   * Closed cards outline in the P&L colour at 2px. Open cards keep the muted
   * hairline even when the wash is tinted.
   */
  emphasizeBorder?: boolean;
  /** No-comment cards draw their wash at the compact angle. */
  compact?: boolean;
  children: React.ReactNode;
}

/**
 * The surface a position card is drawn on. Dark mode lays a diagonal P&L wash
 * under the content. Light mode has no wash. A closed card's border takes the
 * same hue, heavier, so a win and a loss still read at a glance without it.
 *
 * Liquid Glass was tried here and dropped -- a material that samples whatever
 * scrolled behind it reads as noise in a list of cards.
 */
const PositionCardShell: React.FC<PositionCardShellProps> = ({
  tone = 'neutral',
  emphasizeBorder = false,
  compact = false,
  children,
}) => {
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();
  // `flatten` can return a primitive style, which has no radius. The token
  // class resolves to a style object; anything else leaves the clip square.
  const flattenedCardRadius = StyleSheet.flatten(tw.style('rounded-2xl'));
  const clipRadius =
    typeof flattenedCardRadius === 'object' &&
    flattenedCardRadius !== null &&
    'borderRadius' in flattenedCardRadius &&
    typeof flattenedCardRadius.borderRadius === 'number'
      ? flattenedCardRadius.borderRadius
      : undefined;
  const showWash = themeAppearance === AppThemeKey.dark && tone !== 'neutral';
  const wash = washLineFor(emphasizeBorder, compact);
  const colorsForWash =
    tone === 'positive'
      ? washColors(colors.success.muted, colors.success.default)
      : tone === 'negative'
        ? washColors(colors.error.muted, colors.error.default)
        : null;

  return (
    <Box
      testID="position-card-shell"
      twClassName={`rounded-2xl overflow-hidden ${borderClassName(tone, emphasizeBorder)}`}
    >
      {showWash && colorsForWash ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={[styles.clip, { borderRadius: clipRadius }]}
        >
          <LinearGradient
            colors={colorsForWash}
            locations={GRADIENT_LOCATIONS}
            start={wash.start}
            end={wash.end}
            style={styles.surface}
          />
        </View>
      ) : null}
      <Box testID="position-card-shell-content" twClassName="p-3 gap-2">
        {children}
      </Box>
    </Box>
  );
};

export default PositionCardShell;
