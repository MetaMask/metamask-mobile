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
      paddingVertical: 20,
    },
    edit: {
      position: 'absolute',
      right: 10,
      top: 8,
    },
    image: {
      marginTop: 28,
      height: '28%',
      width: '100%',
    },
    buttonSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    buttons: {
      width: '48%',
    },
    title: {
      marginLeft: 8,
    },
    requestSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      height: 24,
      width: 24,
    },
    listWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingInline: 2,
    },
    textSection: {
      marginLeft: 8,
      width: '90%',
    },
    accountIcon: {
      marginRight: -6,
    },
  });
};

export default styleSheet;
