import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for Perps home header — search-expanded mode (nav row uses HeaderStandard).
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.background.default,
    },
    headerContainerWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 16,
      flex: 1,
    },
    searchButton: {
      padding: 4,
    },
    searchBarContainer: {
      flex: 1,
      marginRight: 8,
    },
    testnetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      backgroundColor: theme.colors.warning.muted,
      marginLeft: 8,
      gap: 4,
    },
    testnetDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.warning.default,
    },
  });
};

export default styleSheet;
