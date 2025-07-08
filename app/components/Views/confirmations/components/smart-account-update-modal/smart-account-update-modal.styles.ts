import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    bottomSheet: {
      backgroundColor: theme.colors.background.alternative,
    },
    wrapper: {
      backgroundColor: theme.colors.background.alternative,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 640,
      width: '100%',
      paddingInline: 8,
      paddingTop: 20,
    },
    edit: {
      position: 'absolute',
      right: 10,
      top: 8,
    },
    button: {
      alignSelf: 'center',
      marginVertical: 12,
      width: '90%',
    },
  });
};

export default styleSheet;
