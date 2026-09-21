import React, { memo, useMemo } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import AnimatedNumericText from '../AnimatedNumericText/AnimatedNumericText';
import { NUMERIC_LAYOUT_TRANSITION } from '../AnimatedNumericText/AnimatedNumericText.constants';
import { useTheme } from '../../../util/theme';
import { useBlinkingCursor } from './useBlinkingCursor';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cursor: {
    marginHorizontal: 5,
    width: 1,
  },
});

export interface AnimatedAmountCursorProps {
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  visible?: boolean;
}

export interface AnimatedAmountDisplayProps {
  amountTestID?: string;
  animated?: boolean;
  animateFontSize?: boolean;
  color?: TextColor;
  containerStyle?: StyleProp<ViewStyle>;
  cursor?: false | AnimatedAmountCursorProps;
  disabled?: boolean;
  fitToWidth?: boolean;
  fontWeight?: FontWeight;
  loading?: boolean;
  loadingContent?: React.ReactNode;
  minimumFontScale?: number;
  onPress?: () => void;
  prefix?: React.ReactNode;
  rollDigits?: boolean;
  style?: StyleProp<TextStyle>;
  suffix?: React.ReactNode;
  testID?: string;
  variant?: TextVariant;
  value: string;
}

const AnimatedAmountDisplay = ({
  animated = true,
  amountTestID,
  animateFontSize = false,
  color = TextColor.TextDefault,
  containerStyle,
  cursor = false,
  disabled = false,
  fitToWidth = false,
  fontWeight,
  loading = false,
  loadingContent,
  minimumFontScale = 0.4,
  onPress,
  prefix,
  rollDigits = true,
  style,
  suffix,
  testID,
  variant = TextVariant.DisplayLg,
  value,
}: AnimatedAmountDisplayProps) => {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const cursorVisible = cursor !== false && cursor.visible !== false;
  const cursorAnimated =
    cursor !== false && cursor.animated !== false && !reduceMotion;
  const cursorOpacity = useBlinkingCursor(cursorVisible && cursorAnimated);
  const layout =
    animated && !reduceMotion ? NUMERIC_LAYOUT_TRANSITION : undefined;

  const defaultCursorStyle = useMemo(
    () => ({
      ...styles.cursor,
      backgroundColor: colors.primary.default,
      height: 40,
    }),
    [colors.primary.default],
  );
  const cursorOpacityStyle = useMemo(
    () => ({ opacity: cursorAnimated ? cursorOpacity : 1 }),
    [cursorAnimated, cursorOpacity],
  );

  const renderAffix = (affix: React.ReactNode) => {
    if (typeof affix !== 'string') {
      return affix;
    }

    return (
      <Text
        color={color}
        fontWeight={fontWeight}
        style={style}
        variant={variant}
      >
        {affix}
      </Text>
    );
  };

  const amount = fitToWidth ? (
    <RNText
      adjustsFontSizeToFit
      minimumFontScale={minimumFontScale}
      numberOfLines={1}
      style={style}
      testID={amountTestID}
    >
      {value}
    </RNText>
  ) : (
    <AnimatedNumericText
      animateFontSize={animateFontSize}
      animated={animated}
      color={color}
      fontWeight={fontWeight}
      rollDigits={rollDigits}
      style={style}
      testID={amountTestID}
      containerStyle={
        amountTestID
          ? (StyleSheet.flatten(style) as StyleProp<ViewStyle>)
          : undefined
      }
      value={value}
      variant={variant}
    />
  );

  const content = loading ? (
    <Animated.View
      style={[styles.container, containerStyle]}
      testID={onPress ? undefined : testID}
    >
      {loadingContent}
    </Animated.View>
  ) : (
    <Animated.View
      style={[styles.container, containerStyle]}
      testID={onPress ? undefined : testID}
    >
      {renderAffix(prefix)}
      <Animated.View layout={layout}>{amount}</Animated.View>
      {cursor !== false && cursorVisible ? (
        <Animated.View layout={layout}>
          <RNAnimated.View
            style={[defaultCursorStyle, cursor.style, cursorOpacityStyle]}
            testID={cursor.testID}
          />
        </Animated.View>
      ) : null}
      <Animated.View layout={layout}>{renderAffix(suffix)}</Animated.View>
    </Animated.View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      {content}
    </Pressable>
  );
};

AnimatedAmountDisplay.displayName = 'AnimatedAmountDisplay';

export default memo(AnimatedAmountDisplay);
