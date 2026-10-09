import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Laminar } from 'react-native-laminar';

import { splitNumericString } from './splitNumericString';

export interface AnimatedNumericTextProps {
  value: string;
  color?: TextColor;
  testID?: string;
  animated?: boolean;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontVariant: ['tabular-nums'],
  },
});

const AnimatedNumericText = ({
  value,
  color = TextColor.TextDefault,
  testID,
  animated = true,
}: AnimatedNumericTextProps) => {
  const tw = useTailwind();
  const reduceMotion = useReducedMotion();
  const textStyle = StyleSheet.flatten([
    tw.style('text-display-lg', 'font-default-bold', color),
    styles.text,
  ]);
  const motionEnabled = animated && !reduceMotion;
  const { prefix, numeric, suffix } = splitNumericString(value);

  const renderStaticText = (content: string) => (
    <Text style={textStyle}>{content}</Text>
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
      style={styles.container}
    >
      {!motionEnabled || !numeric ? (
        renderStaticText(value)
      ) : (
        <>
          {prefix ? renderStaticText(prefix) : null}
          <Laminar
            autoSize
            animationDuration={270}
            animationPreset="snappy"
            text={numeric}
            variant="number"
            align="left"
            style={textStyle}
          />
          {suffix ? renderStaticText(suffix) : null}
        </>
      )}
    </View>
  );
};

AnimatedNumericText.displayName = 'AnimatedNumericText';

export default memo(AnimatedNumericText);
