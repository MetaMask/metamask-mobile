import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      padding: 16,
      paddingBottom: 36,
      borderTopRightRadius: 16,
      borderTopLeftRadius: 16,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    button: {
      flex: 1,
    },
    description: {
      marginBottom: 16,
    },
    title: {
      marginBottom: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    balanceInfo: {
      marginTop: 16,
      marginBottom: 24,
    },
  });
};

export default styleSheet;
