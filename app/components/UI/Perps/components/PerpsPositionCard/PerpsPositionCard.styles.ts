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
      // padding: 16,
      marginVertical: 6,
    },
    // Container styles for different states
    expandedContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
    },
    collapsedContainer: {
      borderRadius: 8,
      paddingVertical: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    tokenIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
      paddingVertical: 8,
      marginBottom: 8,
    },
    bodyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bodyItem: {
      flex: 1,
      alignItems: 'flex-start',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
  });
};

export default styleSheet;
