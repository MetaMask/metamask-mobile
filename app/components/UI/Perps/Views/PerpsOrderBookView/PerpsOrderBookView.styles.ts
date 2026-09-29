import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    groupingSelectButtonAccessory: {
      marginRight: 8,
      alignSelf: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 12,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    depthChartSection: {
      paddingTop: 16,
    },
    tableSection: {
      // No flex or minHeight - let content determine size
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.background.default,
    },
    spreadContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 12,
      gap: 4,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButtonWrapper: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spreadInfoContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    midPriceText: {
      marginHorizontal: 8,
    },
  });
};

export default styleSheet;
