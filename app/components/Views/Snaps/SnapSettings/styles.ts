/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createStyles = (colors: any) =>
  StyleSheet.create({
    snapSettingsContainer: {
      flex: 1,
      padding: 10,
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
      width: '70%',
      alignSelf: 'center',
    },
    button: {
      flex: 1,
      margin: 2,
    },
  });
