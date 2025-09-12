import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    // Legacy container for backward compatibility
    container: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      marginVertical: 6,
    },
    // Container styles for different states
    expandedContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
    },
    collapsedContainer: {
      borderRadius: 8,
      paddingVertical: 12,
      marginVertical: 2, // Reduced spacing between cards
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerExpanded: {
      marginBottom: 16, // Extra spacing for expanded cards before the divider
    },
    // Icon section styles
    perpIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    headerLeft: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // Right accessory styles
    rightAccessory: {
      marginLeft: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingVertical: 16,
      marginBottom: 4,
    },
    bodyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    bodyRowLast: {
      marginBottom: 0,
    },
    bodyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bodyItemLabel: {
      marginBottom: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
    fundingCostLabelRightMargin: {
      marginRight: 4,
    },
    fundingCostLabelFlex: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
