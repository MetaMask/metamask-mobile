import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background.default,
    },
    listContainer: {
      flex: 1,
    },
    headerTextContainer: {
      gap: 8,
      paddingBottom: 16,
    },
    balanceCardHeader: {
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
