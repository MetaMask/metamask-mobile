import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    marketContainer: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 16,
      padding: 16,
      marginVertical: 8,
    },
    marketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    marketFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      width: '100%',
      marginTop: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginTop: 16,
    },
    buttonYes: {
      width: '48%',
      color: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
    },
    buttonNo: {
      width: '48%',
      color: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
    },
  });
};

export default styleSheet;
