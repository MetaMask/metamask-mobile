import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 24,
      backgroundColor: colors.background.default,
      width: '100%',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      padding: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      padding: 16,
    },
    titleText: {
      marginBottom: 16,
    },
    marketEntry: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
    },
    tabView: {
      flex: 1,
      width: '100%',
    },
    tabContent: {
      flex: 1,
      paddingTop: 16,
      width: '100%',
    },
  });
};

export default styleSheet;
