import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
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
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    termsApply: {
      textDecorationLine: 'underline',
    },
    balanceCardContainer: {
      paddingVertical: 12,
    },
  });

export default styleSheet;
