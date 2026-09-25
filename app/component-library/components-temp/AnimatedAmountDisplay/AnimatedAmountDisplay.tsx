import React, { memo, useMemo } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
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
import { useReducedMotion } from 'react-native-reanimated';

import AnimatedNumericText from '../AnimatedNumericText/AnimatedNumericText';
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
  color?: TextColor;
  containerStyle?: StyleProp<ViewStyle>;
  cursor?: false | AnimatedAmountCursorProps;
  disabled?: boolean;
  /** Use native text autosizing for legacy high-precision displays. */
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
  suffixColor?: TextColor;
  suffixStyle?: StyleProp<TextStyle>;
  testID?: string;
  variant?: TextVariant;
  value: string;
}

const AnimatedAmountDisplay = ({
  animated = true,
  amountTestID,
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
  suffixColor,
  suffixStyle,
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

  const renderAffix = (
    affix: React.ReactNode,
    affixStyle?: StyleProp<TextStyle>,
    affixColor?: TextColor,
  ) => {
    if (typeof affix === 'string') {
      return (
        <Text
          color={affixColor ?? color}
          fontWeight={fontWeight}
          style={[style, affixStyle]}
          variant={variant}
        >
          {affix}
        </Text>
      );
    }

    return affix;
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
      animated={animated}
      color={color}
      fontWeight={fontWeight}
      rollDigits={rollDigits}
      style={style}
      testID={amountTestID}
      value={value}
      variant={variant}
    />
  );

  const content = loading ? (
    <View
      style={[styles.container, containerStyle]}
      testID={onPress ? undefined : testID}
    >
      {loadingContent}
    </View>
  ) : (
    <View
      style={[styles.container, containerStyle]}
      testID={onPress ? undefined : testID}
    >
      {renderAffix(prefix)}
      {amount}
      {cursor !== false && cursorVisible ? (
        <RNAnimated.View
          style={[defaultCursorStyle, cursor.style, cursorOpacityStyle]}
          testID={cursor.testID}
        />
      ) : null}
      {renderAffix(suffix, suffixStyle, suffixColor)}
    </View>
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
