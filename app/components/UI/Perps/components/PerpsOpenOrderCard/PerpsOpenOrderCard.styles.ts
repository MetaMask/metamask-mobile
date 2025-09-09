import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    // Container styles for different states
    expandedContainer: {
      backgroundColor: colors.background.section, // Darker contrasting background
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
    },
    collapsedContainer: {
      backgroundColor: colors.background.section, // Same darker contrasting background as expanded
      borderRadius: 8,
      padding: 12,
      marginVertical: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
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
      backgroundColor: colors.background.alternative,
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
    headerIcon: {
      marginRight: 4,
    },
    rightAccessory: {
      marginLeft: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingVertical: 16,
      marginBottom: 16,
    },
    bodyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bodyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bodyItemReduceOnly: {
      flex: 0, // Don't expand, take natural width to create space-between effect
      alignItems: 'flex-end', // Right-align the content
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
    fillBadge: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fillBadgeIcon: {
      marginRight: 4,
    },

    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 4,
    },
  });
};

export default styleSheet;
