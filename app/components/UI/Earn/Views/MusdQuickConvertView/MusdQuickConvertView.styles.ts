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
    headerTextContainer: {
      gap: 8,
    },
    balanceCardHeader: {
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerContainer: {
      paddingBottom: 16,
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
    termsApply: {
      textDecorationLine: 'underline',
    },
  });
};

export default styleSheet;
