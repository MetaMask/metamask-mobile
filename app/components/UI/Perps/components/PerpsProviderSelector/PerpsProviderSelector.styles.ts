import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for PerpsProviderSelector components
 */
export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    // Badge styles
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      marginLeft: 8,
    },
    badgeText: {
      marginRight: 4,
    },

    // Bottom sheet styles
    optionsList: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.background.default,
    },
    optionRowSelected: {
      backgroundColor: theme.colors.primary.muted,
      borderWidth: 1,
      borderColor: theme.colors.primary.default,
    },
    optionContent: {
      flex: 1,
    },
    optionName: {
      marginBottom: 2,
    },
    checkIcon: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;
