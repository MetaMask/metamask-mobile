import { StyleSheet } from 'react-native';

import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 15,
    },
    formTitle: {
      paddingVertical: 5,
    },
    form: {
      paddingVertical: 10,
    },
    input: {
      paddingVertical: 5,
    },
    button: {
      width: '100%',
    },
    clipboardText: {
      marginVertical: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: colors.background.alternative,
      borderRadius: 15,
    },
    textInput: {
      borderColor: colors.background.alternative,
      borderWidth: 2,
      borderRadius: 50,
      paddingHorizontal: Device.isAndroid() ? 20 : 10,
      paddingVertical: Device.isAndroid() ? 0 : 10,
    },
  });

export default createStyles;
