import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';

interface MoneyDividerProps {
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

const MoneyDivider = ({ color, style, testID }: MoneyDividerProps) => {
  const { colors } = useTheme();

  return (
    <Box
      style={[
        styles.divider,
        { backgroundColor: color ?? colors.border.default },
        style,
      ]}
      testID={testID}
    />
  );
};

export default MoneyDivider;
