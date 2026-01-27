import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../../util/theme/models';

/**
 * Styles for PerpsMarketFiltersBar component
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      backgroundColor: theme.colors.background.default,
    },
    sortScrollView: {
      flex: 1,
      maxWidth: '100%',
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 16,
      gap: 8,
    },
  });
};

export default styleSheet;
