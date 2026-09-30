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
    footerWithSummary: {
      paddingTop: 0,
    },
  });
};
