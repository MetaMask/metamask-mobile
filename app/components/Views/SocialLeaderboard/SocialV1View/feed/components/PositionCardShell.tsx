import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../../../util/theme';

/**
 * Horizontal bleed that cancels the shell's padding, so a full-width rule can
 * reach the card's borders. Kept next to the padding it negates -- the two have
 * to move together, and they live in different components.
 */
export const POSITION_CARD_BLEED_TW_CLASS = '-mx-4';

/**
 * Card accent. An open position is neutral because its outcome is still
 * undecided; a closed one takes the sign of its realized P&L, so the result
 * reads off the card before any number does.
 */
export type PositionCardTone = 'neutral' | 'positive' | 'negative';

/**
 * A toned card is outlined in its own colour and drawn a shade heavier, because
 * the border is what separates a win from a loss at a glance. Neutral keeps the
 * hairline it has always had.
 */
const TONE_BORDER_TW_CLASS: Record<PositionCardTone, string> = {
  neutral: 'border border-muted',
  positive: 'border-2 border-success-default',
  negative: 'border-2 border-error-default',
};

/** Diagonal wash: strongest in the top-left corner, gone by the bottom-right. */
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

/**
 * A short highlight in the top-left that is already fading by a third of the way
 * across, so most of the card reads as the page behind it.
 */
const GRADIENT_LOCATIONS = [0, 0.32, 1];
const GRADIENT_ALPHAS = [0.09, 0.05, 0];

const styles = StyleSheet.create({
  surface: StyleSheet.absoluteFill,
});

/**
 * The tone's base colour at a given alpha. Every stop shares one hue so the wash
 * fades out through itself -- fading to `transparent` would fade towards *black*,
 * which dirties the middle of the wash on a light theme.
 */
const tintStops = (baseColor: string): string[] =>
  GRADIENT_ALPHAS.map((alpha) => {
    const channel = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0');
    return `${baseColor}${channel}`;
  });

export interface PositionCardShellProps {
  tone?: PositionCardTone;
  children: React.ReactNode;
}

/**
 * The surface a position card is drawn on: the same diagonal wash for every card,
 * differing only in the hue it is mixed from.
 *
 * Liquid Glass was tried here and dropped -- a material that samples whatever
 * scrolled behind it reads as noise in a list of cards, and it cannot carry the
 * one unambiguous colour a toned card exists to show.
 */
const PositionCardShell: React.FC<PositionCardShellProps> = ({
  tone = 'neutral',
  children,
}) => {
  const { colors } = useTheme();
  const baseColor =
    tone === 'positive'
      ? colors.success.default
      : tone === 'negative'
        ? colors.error.default
        : colors.icon.default;

  return (
    <Box
      twClassName={`rounded-2xl p-4 gap-3 overflow-hidden ${TONE_BORDER_TW_CLASS[tone]}`}
    >
      <LinearGradient
        colors={tintStops(baseColor)}
        locations={GRADIENT_LOCATIONS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.surface}
        pointerEvents="none"
      />
      {children}
    </Box>
  );
};

export default PositionCardShell;
