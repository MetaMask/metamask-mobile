import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NumberFlow } from 'number-flow-react-native/native';

import {
  NUMERIC_LAYOUT_TRANSITION,
  NUMERIC_SLOT_ENTERING,
  NUMERIC_SLOT_EXITING,
  NUMERIC_SLOT_TIMING,
} from './AnimatedNumericText.constants';
import { splitNumericString } from './splitNumericString';

export interface AnimatedNumericTextProps {
  /**
   * Display string. Any text around the first numeric run (currency symbol,
   * ticker, "available") renders as static text and never animates.
   */
  value: string;
  /**
   * Whether digits roll when they change in place. Turn this off for text
   * driven by a keypad: characters are only ever appended or deleted there, so
   * a digit never actually changes value and the roll is unused overhead.
   *
   * @default true
   */
  rollDigits?: boolean;
  variant?: TextVariant;
  color?: TextColor;
  fontWeight?: FontWeight;
  twClassName?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  animated?: boolean;
}

const DIGIT_PATTERN = /\d/u;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontVariant: ['tabular-nums'],
  },
});

type AnimatedViewProps = ComponentProps<typeof Animated.View>;

interface NumericSlotProps {
  character: string;
  textStyle: TextStyle;
  animated: boolean;
  roll: boolean;
  entering: AnimatedViewProps['entering'];
  exiting: AnimatedViewProps['exiting'];
  layout: AnimatedViewProps['layout'];
}

/**
 * Memoised so appending a character re-renders one slot rather than all of
 * them. Number Flow measures glyphs asynchronously per font configuration, so
 * mounting it needlessly is what makes a keypress feel delayed.
 */
const NumericSlot = memo(
  ({
    character,
    textStyle,
    animated,
    roll,
    entering,
    exiting,
    layout,
  }: NumericSlotProps) => (
    <Animated.View entering={entering} exiting={exiting} layout={layout}>
      {roll && DIGIT_PATTERN.test(character) ? (
        <NumberFlow
          value={Number(character)}
          locales="en-US"
          style={textStyle}
          animated={animated}
          respectMotionPreference
          spinTiming={NUMERIC_SLOT_TIMING}
          transformTiming={NUMERIC_SLOT_TIMING}
          opacityTiming={NUMERIC_SLOT_TIMING}
        />
      ) : (
        <Text style={textStyle}>{character}</Text>
      )}
    </Animated.View>
  ),
);

NumericSlot.displayName = 'NumericSlot';

const FONT_WEIGHT_SUFFIX: Record<FontWeight, string> = {
  [FontWeight.Regular]: 'regular',
  [FontWeight.Medium]: 'medium',
  [FontWeight.Bold]: 'bold',
};

/**
 * Default weight per variant. Mirrors the design system's own variant/weight
 * mapping, which it does not export; Number Flow needs a resolved style object
 * so the font family cannot be delegated to `Text`.
 */
const VARIANT_FONT_WEIGHT: Record<TextVariant, FontWeight> = {
  [TextVariant.DisplayLg]: FontWeight.Bold,
  [TextVariant.DisplayMd]: FontWeight.Bold,
  [TextVariant.HeadingLg]: FontWeight.Bold,
  [TextVariant.HeadingMd]: FontWeight.Bold,
  [TextVariant.HeadingSm]: FontWeight.Bold,
  [TextVariant.BodyLg]: FontWeight.Medium,
  [TextVariant.BodyMd]: FontWeight.Regular,
  [TextVariant.BodySm]: FontWeight.Regular,
  [TextVariant.BodyXs]: FontWeight.Regular,
  [TextVariant.PageHeading]: FontWeight.Bold,
  [TextVariant.SectionHeading]: FontWeight.Bold,
  [TextVariant.ButtonLabelMd]: FontWeight.Medium,
  [TextVariant.ButtonLabelLg]: FontWeight.Medium,
  [TextVariant.AmountDisplayLg]: FontWeight.Bold,
};

/**
 * Renders a numeric string as one animated slot per character.
 *
 * Number Flow keys digits by place value (`integer:0` is the ones column), so
 * feeding it a whole appended value re-rolls every digit: `123` -> `1237` moves
 * ones 3->7, tens 2->3, hundreds 1->2. Keying each slot by its index from the
 * left keeps typed digits still and animates only the appended one.
 */
const AnimatedNumericText = ({
  value,
  rollDigits = true,
  variant = TextVariant.BodyMd,
  color = TextColor.TextDefault,
  fontWeight,
  twClassName,
  style,
  containerStyle,
  testID,
  animated = true,
}: AnimatedNumericTextProps) => {
  const tw = useTailwind();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  const textStyle = useMemo(() => {
    const weight = fontWeight ?? VARIANT_FONT_WEIGHT[variant];

    return StyleSheet.flatten([
      tw.style(
        `text-${variant}`,
        `font-default-${FONT_WEIGHT_SUFFIX[weight]}`,
        color,
        twClassName,
      ),
      styles.text,
      style,
    ]) as TextStyle;
  }, [color, fontWeight, style, tw, twClassName, variant]);

  const rowStyle = useMemo(
    () => StyleSheet.flatten([styles.container, containerStyle]) as ViewStyle,
    [containerStyle],
  );

  const { prefix, numeric, suffix } = useMemo(
    () => splitNumericString(value),
    [value],
  );

  const characters = useMemo(() => numeric.split(''), [numeric]);

  // Slots present on the first render are already on screen, so only later
  // appends animate in.
  const entering =
    animated && hasMountedRef.current ? NUMERIC_SLOT_ENTERING : undefined;
  const exiting = animated ? NUMERIC_SLOT_EXITING : undefined;
  const layout = animated ? NUMERIC_LAYOUT_TRANSITION : undefined;
  // An append-only row never reflows internally, so per-slot transitions would
  // only fire when the caller restyles (a font size step) and animate every
  // character sliding to its new size at once.
  const slotLayout = rollDigits ? layout : undefined;

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
      layout={layout}
      style={rowStyle}
    >
      {prefix ? (
        <Animated.Text layout={layout} style={textStyle}>
          {prefix}
        </Animated.Text>
      ) : null}
      {characters.map((character, index) => (
        <NumericSlot
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          character={character}
          textStyle={textStyle}
          animated={animated}
          roll={rollDigits}
          entering={entering}
          exiting={exiting}
          layout={slotLayout}
        />
      ))}
      {suffix ? (
        <Animated.Text layout={layout} style={textStyle}>
          {suffix}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
};

export default AnimatedNumericText;
