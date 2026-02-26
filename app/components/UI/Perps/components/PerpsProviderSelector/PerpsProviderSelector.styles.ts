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
      gap: 4,
    },
    badgeText: {},

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
    optionNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 2,
    },
    optionName: {},
    testnetTag: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: theme.colors.warning.muted,
    },
    testnetDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.warning.default,
    },
    checkIcon: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;
