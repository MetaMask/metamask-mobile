import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { StyleSheet } from 'react-native';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {},
    text: {
      fontSize: 12,
      color: colors.text.alternative,
      marginVertical: 0,
      lineHeight: 20,
    },
    fiatBalance: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 0,
      lineHeight: 24,
    },
  });

export default createStyles;
