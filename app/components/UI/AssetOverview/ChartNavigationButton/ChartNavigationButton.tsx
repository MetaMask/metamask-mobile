import React, { useContext, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import Text from '../../../Base/Text';

const createStyles = (colors: ThemeColors, selected: boolean) =>
  StyleSheet.create({
    button: {
      backgroundColor: selected
        ? colors.primary.default
        : colors.background.default,
      borderRadius: 40,
      paddingVertical: 2,
      paddingHorizontal: 8,
      // compensates for letter spacing
      paddingLeft: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      textTransform: 'uppercase',
      letterSpacing: 3,
      fontSize: 12,
      color: selected ? colors.background.default : colors.primary.default,
      textAlign: 'center',
    },
  });

interface ChartNavigationButtonProps {
  onPress: () => void;
  label: string;
  selected: boolean;
}

const ChartNavigationButton = ({
  onPress,
  label,
  selected,
}: ChartNavigationButtonProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(
    () => createStyles(colors, selected),
    [colors, selected],
  );

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};
export default ChartNavigationButton;
