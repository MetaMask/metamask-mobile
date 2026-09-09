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
  /**
   * Render plain text until the JS thread is idle before mounting Laminar.
   * Useful for secondary values on screens opened during app startup.
   *
   * @default false
   */
  deferRolling?: boolean;
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

interface IdleCallbackGlobals {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
}

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
  deferRolling = false,
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
  const [rollingReady, setRollingReady] = React.useState(!deferRolling);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!deferRolling) {
      setRollingReady(true);
      return;
    }

    const idleGlobals = globalThis as typeof globalThis & IdleCallbackGlobals;
    if (idleGlobals.requestIdleCallback) {
      const handle = idleGlobals.requestIdleCallback(() =>
        setRollingReady(true),
      );
      return () => idleGlobals.cancelIdleCallback?.(handle);
    }

    const timeout = setTimeout(() => setRollingReady(true), 100);
    return () => clearTimeout(timeout);
  }, [deferRolling]);

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
  const shouldRenderLaminar =
    rollDigits && rollingReady && animated && !reduceMotion;

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
      layout={layout}
      style={rowStyle}
    >
      {shouldRenderLaminar ? (
        <Laminar
          text={value}
          variant="slots"
          autoSize={false}
          clipToBounds
          animationPreset="snappy"
          animationDuration={NUMERIC_SLOT_TIMING.duration}
          style={textStyle}
        />
      ) : rollDigits ? (
        <Animated.Text layout={layout} style={textStyle}>
          {value}
        </Animated.Text>
      ) : (
        <>
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
              entering={entering}
              exiting={exiting}
            />
          ))}
          {suffix ? (
            <Animated.Text layout={layout} style={textStyle}>
              {suffix}
            </Animated.Text>
          ) : null}
        </>
      )}
    </Animated.View>
  );
};

export default AnimatedNumericText;
