import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    firstTimeIcon: {
      width: 48,
      height: 48,
      marginTop: 16,
      marginBottom: 8,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      paddingTop: 8,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 8,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center',
    },
    bottomSheetContent: {
      padding: 24,
    },
    actionButton: {
      marginBottom: 12,
    },
    firstTimeContainer: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    firstTimeContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    firstTimeTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    firstTimeDescription: {
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    startTradingButton: {
      marginTop: 16,
      width: '100%',
    },
  });
};

export default styleSheet;
