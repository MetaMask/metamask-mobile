import { StyleSheet } from 'react-native';

const createStyles = (colors: any) =>
  StyleSheet.create({
    keyboardAwareWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    updateNickView: {
      margin: 0,
    },
    headerWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      top: 20,
      marginVertical: 20,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingVertical: 20,
      backgroundColor: colors.background.default,
    },
    icon: {
      position: 'absolute',
      right: 0,
      padding: 10,
      color: colors.icon.default,
    },
    headerText: {
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 15,
    },
  });

export default createStyles;
