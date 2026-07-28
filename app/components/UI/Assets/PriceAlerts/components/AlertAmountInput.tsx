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
  // Wraps text + cursor when in placeholder mode so the cursor can be
  // absolutely positioned in the centre without changing the outer layout.
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  // Same visual footprint as the in-flow cursor (ml-1 w-0.5) so the row
  // width stays identical to the hasInput case.
  cursorSpacer: {
    flexShrink: 0,
    marginLeft: 4,
    width: 2,
  },
  // Overlay that fills placeholderRow and centres the cursor inside it.
  cursorOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface AlertAmountInputProps {
  text: string;
  hasInput: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  testID: string;
  cursorTwClassName?: string;
}

const AlertAmountInput: React.FC<AlertAmountInputProps> = ({
  text,
  hasInput,
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
        {hasInput ? (
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
        ) : (
          // Placeholder: text renders normally; an invisible spacer holds the
          // same width as the in-flow cursor so the outer row size is stable;
          // the real cursor floats in an overlay centred over the whole row.
          <View style={styles.placeholderRow}>
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
            {/* invisible spacer — same dimensions as the in-flow cursor so layout is stable */}
            <View style={styles.cursorSpacer} />
            <View style={styles.cursorOverlay} pointerEvents="none">
              <Animated.View
                style={[tw.style(cursorTwClassName), { opacity: fadeAnim }]}
              />
            </View>
          </View>
        )}
        {suffix}
      </Box>
    </Box>
  );
};

export default AlertAmountInput;
