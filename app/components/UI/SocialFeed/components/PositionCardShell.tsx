import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
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
 * The design runs the wash corner to corner: full tint at the top-right
 * corner, clear at 70% of the way to the bottom-left one -- CSS
 * `to bottom left`. That keeps the fade parallel to the card's other diagonal,
 * so the angle depends on the card's aspect ratio: ~192° on a compact card,
 * ~214° on an expanded one. The stops in between sample the same falloff so a
 * short card does not band.
 */
const WASH_LOCATIONS = [0, 0.175, 0.35, 0.525, 0.7];

/** The expanded card's angle, used until the card has been measured. */
const DEFAULT_WASH_ANGLE = 214.2;

/** CSS degrees (0° points up) of `to bottom left` for a `width` x `height` box. */
export const washAngleFor = (width: number, height: number) =>
  180 + (Math.atan2(height, width) * 180) / Math.PI;

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
 * Intermediate stops sample that line so the fade stays smooth on a short card.
 */
const hexChannel = (value: number) =>
  Math.round(value).toString(16).padStart(2, '0');

const hexChannels = (hex: string): [number, number, number, number] => {
  const value = hex.replace('#', '');
  const alpha = value.length >= 8 ? value.slice(6, 8) : 'ff';
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    parseInt(alpha, 16),
  ];
};

const mixHex = (from: string, to: string, amount: number) => {
  const start = hexChannels(from);
  const end = hexChannels(to);
  const mixed = ([0, 1, 2, 3] as const).map((index) =>
    hexChannel(start[index] + (end[index] - start[index]) * amount),
  );
  return `#${mixed.join('')}`;
};

const washColors = (muted: string, base: string): string[] => {
  const clear = `${base}00`;
  const clearAt = WASH_LOCATIONS[WASH_LOCATIONS.length - 1];
  return WASH_LOCATIONS.map((location, index) => {
    if (index === 0) {
      return muted;
    }
    if (index === WASH_LOCATIONS.length - 1) {
      return clear;
    }
    return mixHex(muted, clear, location / clearAt);
  });
};

/**
 * `border-muted` is translucent, and the design paints it inside the card, on
 * top of the wash, so the tint shows through the hairline. A border on the card
 * itself would sit outside the wash (absolute children start inside the
 * parent's border), so the hairline is an overlay drawn last instead.
 */
const BORDER_OVERLAY_CLASS_NAME =
  'absolute inset-0 rounded-2xl border border-muted';

export interface PositionCardShellProps {
  tone?: PositionCardTone;
  children: React.ReactNode;
}

/**
 * The surface a position card is drawn on. Dark mode lays one diagonal P&L
 * wash under the content, and that wash scales with the card. Light mode has
 * no wash. Open and closed cards share the muted 1px border.
 *
 * Liquid Glass was tried here and dropped -- a material that samples whatever
 * scrolled behind it reads as noise in a list of cards.
 */
const PositionCardShell: React.FC<PositionCardShellProps> = ({
  tone = 'neutral',
  children,
}) => {
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();
  const [washAngle, setWashAngle] = useState(DEFAULT_WASH_ANGLE);
  const handleWashLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setWashAngle(washAngleFor(width, height));
    }
  }, []);
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
  const colorsForWash =
    tone === 'positive'
      ? washColors(colors.success.muted, colors.success.default)
      : tone === 'negative'
        ? washColors(colors.error.muted, colors.error.default)
        : null;

  return (
    <Box testID="position-card-shell" twClassName="rounded-2xl overflow-hidden">
      {showWash && colorsForWash ? (
        <View
          pointerEvents="none"
          collapsable={false}
          onLayout={handleWashLayout}
          style={[styles.clip, { borderRadius: clipRadius }]}
        >
          <LinearGradient
            colors={colorsForWash}
            locations={WASH_LOCATIONS}
            useAngle
            angle={washAngle}
            style={styles.surface}
          />
        </View>
      ) : null}
      <Box testID="position-card-shell-content" twClassName="p-3 gap-2">
        {children}
      </Box>
      <Box
        testID="position-card-shell-border"
        pointerEvents="none"
        twClassName={BORDER_OVERLAY_CLASS_NAME}
      />
    </Box>
  );
};

export default PositionCardShell;
