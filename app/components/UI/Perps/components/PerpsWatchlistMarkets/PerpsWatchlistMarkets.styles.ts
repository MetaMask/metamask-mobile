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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: theme.colors.background.section,
    },
    listContent: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
