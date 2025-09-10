import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    titleText: {
      marginBottom: 4,
    },
    priceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    marketListContainer: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
    },
    marketEntry: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
    },
    bottomSheetContent: {
      padding: 24,
    },
    bottomSheetAmount: {
      fontWeight: 'bold',
      textAlign: 'center',
    },
    actionButton: {
      marginBottom: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    loadingContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    skeleton: {
      marginBottom: 12,
      borderRadius: 16,
    },
  });
};

export default styleSheet;
