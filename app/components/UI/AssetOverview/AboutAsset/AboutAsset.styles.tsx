import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { StyleSheet } from 'react-native';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      marginTop: 20,
    },
    text: {
      fontSize: 14,
      color: colors.text.alternative,
      marginVertical: 0,
      lineHeight: 22,
    },
    title: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 'bold',
      marginVertical: 0,
      marginBottom: 4,
    },
  });

export default createStyles;
