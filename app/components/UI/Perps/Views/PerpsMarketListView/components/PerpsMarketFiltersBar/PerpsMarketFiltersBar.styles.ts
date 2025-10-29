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
    sortContainer: {
      flex: 1,
    },
    watchlistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
  });
};

export default styleSheet;
