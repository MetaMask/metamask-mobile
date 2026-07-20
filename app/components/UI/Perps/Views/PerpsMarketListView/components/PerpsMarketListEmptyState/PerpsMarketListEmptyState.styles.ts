import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../../util/theme/models';

/**
 * Styles for PerpsMarketListEmptyState component
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
      marginBottom: 120, // Account for tab bar height
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      textAlign: 'center',
      maxWidth: 280,
    },
    cta: {
      marginTop: 20,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
  });
};

export default styleSheet;
