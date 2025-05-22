import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    buttonSection: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    buttons: {
      width: '48%',
    },
    text: {
      marginBottom: 24,
    },
    input: {
      marginBottom: 8,
    },
    title: {
      alignSelf: 'center',
      marginBottom: 24,
    },
    wrapper: {
      backgroundColor: theme.colors.background.default,
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 32,
      paddingTop: 24,
      paddingLeft: 24,
      paddingRight: 24,
    },
  });
};

export default styleSheet;
