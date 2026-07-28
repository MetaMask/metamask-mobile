import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text as RNText, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';

const styles = StyleSheet.create({
  amountText: {
    fontSize: 48,
    flexShrink: 1,
    maxWidth: '95%',
  },
  cursor: {
    flexShrink: 0,
  },
  // Used in placeholder mode: gives the absolutely-positioned cursor a
  // containing block so it can be centred over the text without affecting flow.
  placeholderContainer: {
    position: 'relative',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cursor floats in the centre of the placeholder text, out of normal flow.
  cursorCentered: {
    position: 'absolute',
  },
});

interface AlertAmountInputProps {
  text: string;
  /** When false the text is shown in the muted placeholder colour. */
  isPlaceholder?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  testID: string;
  cursorTwClassName?: string;
}

const AlertAmountInput: React.FC<AlertAmountInputProps> = ({
  text,
  isPlaceholder = false,
  prefix,
  suffix,
  testID,
  cursorTwClassName = 'ml-1 h-10 w-0.5 bg-primary-default',
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="w-full"
      testID={testID}
    >
      {prefix}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="items-baseline max-w-[95%] shrink"
      >
        {isPlaceholder ? (
          // Placeholder state: cursor is absolutely centred over the text so
          // it appears in the middle of the "0" rather than trailing after it.
          <View style={styles.placeholderContainer}>
            <RNText
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              style={[
                tw.style('font-medium'),
                styles.amountText,
                { color: colors.text.alternative },
              ]}
            >
              {text}
            </RNText>
            <Animated.View
              pointerEvents="none"
              style={[
                tw.style(cursorTwClassName),
                styles.cursorCentered,
                { opacity: fadeAnim },
              ]}
            />
          </View>
        ) : (
          <>
            <RNText
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              style={[
                tw.style('font-medium'),
                styles.amountText,
                { color: colors.text.default },
              ]}
            >
              {text}
            </RNText>
            <Animated.View
              style={[
                tw.style(cursorTwClassName),
                styles.cursor,
                { opacity: fadeAnim },
              ]}
            />
          </>
        )}
        {suffix}
      </Box>
    </Box>
  );
};

export default AlertAmountInput;
