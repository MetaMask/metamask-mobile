import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    section: {
      marginBottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      paddingTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    listContent: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
