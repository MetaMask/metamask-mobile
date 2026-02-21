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
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.background.muted,
    },
    marketListContentContainer: {
      paddingBottom: 0,
    },
  });
};

export default styleSheet;
