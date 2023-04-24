/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    snapListContainer: {
      flex: 1,
      padding: 10,
    },
    snapElementContainer: {
      marginBottom: 5,
    },
    webviewContainer: {
      flex: 0.1,
    },
    // eslint-disable-next-line react-native/no-color-literals
    input: {
      height: 30,
      borderColor: 'grey',
      borderWidth: 1,
      margin: 10,
      padding: 5,
      borderRadius: 5,
    },
    btnContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    installBtn: {
      marginHorizontal: 10,
      width: '60%',
      alignSelf: 'center',
    },
    button: {
      flex: 1,
      margin: 2,
    },
  });
