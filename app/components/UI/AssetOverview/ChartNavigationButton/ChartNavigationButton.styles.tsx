import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { StyleSheet } from 'react-native';

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

export default createStyles;
