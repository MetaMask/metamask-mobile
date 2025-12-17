import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    listContainer: {
      flex: 1,
    },
    headerContainer: {
      paddingVertical: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    noFeesTag: {
      backgroundColor: colors.background.muted,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
  });
};

export default styleSheet;
