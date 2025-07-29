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
      padding: 16,
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
      backgroundColor: colors.background.section,
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
    // Icon section styles
    perpIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    tokenIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
