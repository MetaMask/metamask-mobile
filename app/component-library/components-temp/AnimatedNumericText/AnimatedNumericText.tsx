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
import Animated, { useReducedMotion } from 'react-native-reanimated';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Laminar } from 'react-native-laminar';

import {
  NUMERIC_ANIMATION_DURATION,
  NUMERIC_LAYOUT_TRANSITION,
  NUMERIC_SLOT_ENTERING,
  NUMERIC_SLOT_EXITING,
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
  entering: AnimatedViewProps['entering'];
  exiting: AnimatedViewProps['exiting'];
}

/**
 * Memoised so appending a character re-renders one slot rather than all of
 * them. The editable amount uses these lightweight text slots so typing does
 * not rebuild Laminar's digit reels on every keypress.
 */
const NumericSlot = memo(
  ({ character, textStyle, entering, exiting }: NumericSlotProps) => (
    <Animated.View entering={entering} exiting={exiting}>
      <Text style={textStyle}>{character}</Text>
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
 * mapping, which it does not export; Laminar needs a resolved style object so
 * the font family cannot be delegated to `Text`.
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

interface RollingNumericTextProps {
  textStyle: TextStyle;
  value: string;
}

/**
 * Keeps the reduced-motion subscription out of the keypad's append-only path.
 * Laminar is memoised internally, and stable props let it skip unrelated parent
 * renders without rebuilding its digit reels.
 */
const RollingNumericText = memo(
  ({ textStyle, value }: RollingNumericTextProps) => {
    const { prefix, numeric, suffix } = useMemo(
      () => splitNumericString(value),
      [value],
    );

    if (!numeric) {
      return <Text style={textStyle}>{value}</Text>;
    }

    return (
      <>
        {prefix ? <Text style={textStyle}>{prefix}</Text> : null}
        <Laminar
          text={numeric}
          variant="slots"
          autoSize={false}
          clipToBounds
          animationPreset="snappy"
          animationDuration={NUMERIC_ANIMATION_DURATION}
          stagger={0}
          style={textStyle}
        />
        {suffix ? <Text style={textStyle}>{suffix}</Text> : null}
      </>
    );
  },
);

RollingNumericText.displayName = 'RollingNumericText';

interface AppendOnlyNumericTextProps {
  textStyle: TextStyle;
  value: string;
}

const AppendOnlyNumericText = memo(
  ({ textStyle, value }: AppendOnlyNumericTextProps) => {
    const hasMountedRef = useRef(false);
    const { prefix, numeric, suffix } = useMemo(
      () => splitNumericString(value),
      [value],
    );

    useEffect(() => {
      hasMountedRef.current = true;
    }, []);

    const entering = hasMountedRef.current ? NUMERIC_SLOT_ENTERING : undefined;

    return (
      <>
        {prefix ? <Text style={textStyle}>{prefix}</Text> : null}
        {numeric.split('').map((character, index) => (
          <NumericSlot
            // Index identity is intentional: keypad edits append/remove only.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            character={character}
            textStyle={textStyle}
            entering={entering}
            exiting={NUMERIC_SLOT_EXITING}
          />
        ))}
        {suffix ? <Text style={textStyle}>{suffix}</Text> : null}
      </>
    );
  },
);

AppendOnlyNumericText.displayName = 'AppendOnlyNumericText';

/**
 * Renders a numeric string without converting it to a JavaScript number, so
 * token balances retain their full precision.
 *
 * Editable keypad values use index-keyed text slots so appending a digit leaves
 * existing characters still. Secondary values use Laminar's string-native
 * slots renderer for rolling updates.
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
  const reduceMotion = useReducedMotion();

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

  const motionEnabled = animated && !reduceMotion;
  const layout = motionEnabled ? NUMERIC_LAYOUT_TRANSITION : undefined;

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
      layout={layout}
      style={rowStyle}
    >
      {!motionEnabled ? (
        <Text style={textStyle}>{value}</Text>
      ) : rollDigits ? (
        <RollingNumericText textStyle={textStyle} value={value} />
      ) : (
        <AppendOnlyNumericText textStyle={textStyle} value={value} />
      )}
    </Animated.View>
  );
};

AnimatedNumericText.displayName = 'AnimatedNumericText';

export default memo(AnimatedNumericText);
