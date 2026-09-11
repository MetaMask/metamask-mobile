import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import {
  buildNumericSlots,
  getMovingNumericSlotKeys,
  type NumericSlotDescriptor,
} from './buildNumericSlots';
import {
  isIncrementalNumericChange,
  isZeroPlaceholder,
} from './isIncrementalNumericChange';
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
  animateFontSize?: boolean;
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
  slotKey: string;
  glyphKey: string;
  textStyle: TextStyle;
  animatedTextStyle?: ComponentProps<typeof Animated.Text>['style'];
  entering: AnimatedViewProps['entering'];
  exiting: AnimatedViewProps['exiting'];
  layout?: AnimatedViewProps['layout'];
}

/**
 * Memoised so appending a character re-renders one slot rather than all of
 * them. The editable amount uses these lightweight text slots so typing does
 * not rebuild Laminar's digit reels on every keypress.
 *
 * Commas keep a stable outer view (so font-size reflow stays locked to the
 * digits) and remount the inner glyph when they shift, which fades the comma
 * without throwing away the layout animation.
 */
const NumericSlot = memo(
  ({
    character,
    slotKey,
    glyphKey,
    textStyle,
    animatedTextStyle,
    entering,
    exiting,
    layout,
  }: NumericSlotProps) => {
    const glyph = (
      <Animated.Text style={[textStyle, animatedTextStyle]}>
        {character}
      </Animated.Text>
    );

    return (
      <Animated.View entering={entering} exiting={exiting} layout={layout}>
        {slotKey === glyphKey ? (
          glyph
        ) : (
          <Animated.View key={glyphKey} entering={entering} exiting={exiting}>
            {glyph}
          </Animated.View>
        )}
      </Animated.View>
    );
  },
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
  animationDuration?: number;
  textStyle: TextStyle;
  value: string;
}

/**
 * Keeps the reduced-motion subscription out of the keypad's append-only path.
 * Laminar is memoised internally, and stable props let it skip unrelated parent
 * renders without rebuilding its digit reels.
 */
const RollingNumericText = memo(
  ({
    animationDuration = NUMERIC_ANIMATION_DURATION,
    textStyle,
    value,
  }: RollingNumericTextProps) => {
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
          animationPreset="smooth"
          animationDuration={animationDuration}
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
  animatedTextStyle?: ComponentProps<typeof Animated.Text>['style'];
  value: string;
}

const AppendOnlyNumericText = memo(
  ({ textStyle, animatedTextStyle, value }: AppendOnlyNumericTextProps) => {
    const hasMountedRef = useRef(false);
    const previousSlotsRef = useRef<NumericSlotDescriptor[]>([]);
    const { prefix, numeric, suffix } = useMemo(
      () => splitNumericString(value),
      [value],
    );

    useEffect(() => {
      hasMountedRef.current = true;
    }, []);

    const entering = hasMountedRef.current ? NUMERIC_SLOT_ENTERING : undefined;
    const slots = useMemo(
      () => buildNumericSlots(numeric, isZeroPlaceholder(numeric) ? 0 : 1),
      [numeric],
    );
    const movingSlotKeys = useMemo(
      () => getMovingNumericSlotKeys(previousSlotsRef.current, slots),
      [slots],
    );

    useLayoutEffect(() => {
      previousSlotsRef.current = slots;
    }, [slots]);

    return (
      <>
        {prefix ? (
          <Animated.Text style={[textStyle, animatedTextStyle]}>
            {prefix}
          </Animated.Text>
        ) : null}
        {slots.map(({ character, key, glyphKey }) => (
          <NumericSlot
            key={key}
            slotKey={key}
            glyphKey={glyphKey}
            character={character}
            textStyle={textStyle}
            animatedTextStyle={animatedTextStyle}
            entering={entering}
            exiting={NUMERIC_SLOT_EXITING}
            layout={
              movingSlotKeys.has(key) ? NUMERIC_LAYOUT_TRANSITION : undefined
            }
          />
        ))}
        {suffix ? (
          <Animated.Text style={[textStyle, animatedTextStyle]}>
            {suffix}
          </Animated.Text>
        ) : null}
      </>
    );
  },
);

AppendOnlyNumericText.displayName = 'AppendOnlyNumericText';

/**
 * Renders a numeric string without converting it to a JavaScript number, so
 * token balances retain their full precision.
 *
 * Editable keypad values use stable digit slots so appending a digit leaves
 * existing characters still. Grouping commas keep a stable layout wrapper so
 * font-size reflow stays locked to the digits; the comma glyph remounts when
 * it shifts so it fades rather than sliding. Replacing the whole amount at
 * once (percentage / Max) hands the string to Laminar so it rolls the same
 * way balances do. Slots return on the next keypress so we never swap
 * renderers at the end of the roll (that swap reads as a shake). Secondary
 * values use Laminar's string-native slots renderer for rolling updates.
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
  animateFontSize = false,
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
  const displayedValueRef = useRef(value);
  const [rollTarget, setRollTarget] = useState<string | null>(null);
  const incrementalChange = useMemo(
    () => isIncrementalNumericChange(displayedValueRef.current, value),
    [value],
  );
  const incomingBulkReplace =
    motionEnabled && !rollDigits && !incrementalChange;

  useLayoutEffect(() => {
    if (rollDigits || !motionEnabled) {
      displayedValueRef.current = value;
      if (rollTarget !== null) {
        setRollTarget(null);
      }
      return;
    }

    if (!incrementalChange) {
      // Stay on Laminar after the roll so we do not swap renderers mid-settle
      // (that swap is the end-of-roll shake). Slots come back on the next
      // incremental keypress.
      if (rollTarget !== value) {
        setRollTarget(value);
      }
      displayedValueRef.current = value;
      return;
    }

    displayedValueRef.current = value;
    if (rollTarget !== null) {
      setRollTarget(null);
    }
  }, [incrementalChange, motionEnabled, rollDigits, rollTarget, value]);

  const rollingBulkReplace = incomingBulkReplace || rollTarget !== null;
  const layout =
    motionEnabled && !rollingBulkReplace
      ? NUMERIC_LAYOUT_TRANSITION
      : undefined;
  const targetFontSize =
    typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 0;
  const animatedFontSize = useSharedValue(targetFontSize);

  useEffect(() => {
    if (
      motionEnabled &&
      animateFontSize &&
      !rollingBulkReplace &&
      animatedFontSize.value !== targetFontSize
    ) {
      animatedFontSize.value = withTiming(targetFontSize, {
        duration: NUMERIC_ANIMATION_DURATION,
      });
      return;
    }

    animatedFontSize.value = targetFontSize;
  }, [
    animateFontSize,
    animatedFontSize,
    motionEnabled,
    rollingBulkReplace,
    targetFontSize,
  ]);

  const animatedTextStyle = useAnimatedStyle(
    () => ({
      fontSize: animatedFontSize.value,
    }),
    [animatedFontSize],
  );

  // When font size is animated, the shared value owns the size. Leaving the
  // target on the static style lets a newly mounted comma (or digit) measure
  // at the destination size for a frame, which is the "lost then snaps back"
  // jump during a size step.
  const slotTextStyle = useMemo(() => {
    if (!animateFontSize || !targetFontSize) {
      return textStyle;
    }

    const { fontSize: _targetFontSize, ...rest } = textStyle;

    return rest as TextStyle;
  }, [animateFontSize, targetFontSize, textStyle]);

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
      ) : rollDigits || rollingBulkReplace ? (
        <RollingNumericText
          animationDuration={
            incomingBulkReplace && rollTarget === null
              ? 0
              : NUMERIC_ANIMATION_DURATION
          }
          textStyle={textStyle}
          value={
            rollTarget ??
            (incomingBulkReplace ? displayedValueRef.current : value)
          }
        />
      ) : (
        <AppendOnlyNumericText
          textStyle={slotTextStyle}
          animatedTextStyle={
            animateFontSize && targetFontSize ? animatedTextStyle : undefined
          }
          value={value}
        />
      )}
    </Animated.View>
  );
};

AnimatedNumericText.displayName = 'AnimatedNumericText';

export default memo(AnimatedNumericText);
