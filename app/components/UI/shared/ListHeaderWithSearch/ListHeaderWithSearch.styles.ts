import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

/**
 * Styles for ListHeaderWithSearch component
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
    backButton: {
      padding: 4,
    },
    headerContainerWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 16,
    },
    headerTitleContainer: {
      flex: 1,
      paddingLeft: 4,
      paddingRight: 12,
    },
    headerTitle: {
      textAlign: 'left',
    },
    titleButtonsRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchButton: {
      padding: 4,
    },
    searchBarContainer: {
      flex: 1,
      marginRight: 8,
    },
  });
};

export default styleSheet;
