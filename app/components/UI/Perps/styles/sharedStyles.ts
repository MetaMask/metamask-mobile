import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

/**
 * Shared styles for PerpsWatchlistMarkets component
 */
export const createMarketListStyles = (_theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    listContent: {
      paddingHorizontal: 16,
    },
    emptyText: {
      paddingHorizontal: 16,
    },
  });
