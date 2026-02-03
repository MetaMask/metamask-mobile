import { StyleSheet } from 'react-native';
import type { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.background.section,
      overflow: 'hidden',
    },
    cardContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });
};

export default styleSheet;
