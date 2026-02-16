import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../../util/theme/models';

/**
 * Styles for PerpsMarketFiltersBar component
 *
 * Two-row layout:
 * - Row 1: Category badges
 * - Row 2: Sort dropdown
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'column',
      width: '100%',
      backgroundColor: theme.colors.background.default,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
