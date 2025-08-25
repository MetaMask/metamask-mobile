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
      paddingInline: 8,
      paddingVertical: 40,
    },
    buttonSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    buttons: {
      width: '48%',
    },
  });
};

export default styleSheet;
