import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.alternative,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      padding: 8,
    },
    edit: {
      left: 10,
      top: 10,
      position: 'absolute',
    },
    title: {
      marginBottom: 20,
    },
    selectAllWrapper: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginBottom: 10,
      marginLeft: 32,
      width: '100%',
    },
  });
};

export default styleSheet;
