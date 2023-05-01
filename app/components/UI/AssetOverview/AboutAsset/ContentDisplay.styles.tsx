import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { StyleSheet } from 'react-native';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      color: colors.primary.default,
      paddingTop: 8,
      textAlign: 'center',
    },
    content: {
      color: colors.text.alternative,
    },
    disclaimer: {
      color: colors.text.alternative,
      fontSize: 12,
      paddingTop: 16,
    },
  });

export default createStyles;
