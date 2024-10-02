import type { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const stylesSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    mainContainer: {
      paddingTop: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background.alternative,
      height: '100%',
      justifyContent: 'space-between',
    },
    cardsContainer: {
      paddingTop: 8,
      gap: 8,
    },
  });
};

export default stylesSheet;
