import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    buttons: {
      flex: 1,
    },
    buttonSection: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      width: '100%',
    },
    input: {
      marginBottom: 8,
    },
    text: {
      marginBottom: 24,
    },
    title: {
      alignSelf: 'center',
      marginBottom: 24,
    },
    wrapper: {
      backgroundColor: theme.colors.background.default,
      flexDirection: 'column',
      paddingBottom: 32,
      paddingTop: 24,
      paddingLeft: 24,
      paddingRight: 24,
    },
  });
};

export default styleSheet;
