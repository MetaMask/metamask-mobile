import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    marketContainer: {
      width: '100%',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 16,
      padding: 16,
      marginVertical: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    buttonYes: {
      color: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
      paddingHorizontal: 18,
    },
    buttonNo: {
      color: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
      paddingHorizontal: 18,
    },
  });
};

export default styleSheet;
