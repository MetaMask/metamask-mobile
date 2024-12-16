import type { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const stylesSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    mainContainer: {
      flexGrow: 1,
      paddingTop: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background.alternative,
      justifyContent: 'space-between',
    },
    cardsContainer: {
      paddingTop: 16,
      gap: 8,
    },
  });
};

export default stylesSheet;
