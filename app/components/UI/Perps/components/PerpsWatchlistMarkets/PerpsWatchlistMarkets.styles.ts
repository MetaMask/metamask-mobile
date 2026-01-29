import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    section: {
      marginBottom: 30,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      // Horizontal padding comes from parent TabsList (px-4)
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: theme.colors.background.section,
    },
    listContent: {
      // Horizontal padding comes from parent TabsList (px-4)
    },
  });
};

export default styleSheet;
