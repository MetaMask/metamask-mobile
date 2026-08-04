import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 20,
    },
    scrollViewContentWithKeypad: {
      paddingBottom: 100,
    },
    helpTextContainer: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 16,
      // Reserve space so content below doesn't jump when
      // validation HelpText appears or wraps.
      minHeight: 40,
    },
    footerWithSummary: {
      paddingTop: 0,
    },
  });
};
