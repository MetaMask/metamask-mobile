import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    accountCardWrapper: {
      paddingHorizontal: 24,
    },
    intro: {
      ...fontStyles.bold,
      textAlign: 'center',
      color: colors.text.default,
      fontSize: Device.isSmallDevice() ? 16 : 20,
      marginBottom: 8,
      marginTop: 16,
    },
    warning: {
      ...fontStyles.thin,
      color: colors.text.default,
      paddingHorizontal: 24,
      marginBottom: 16,
      fontSize: 14,
      width: '100%',
      textAlign: 'center',
    },
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
  });

export default createStyles;
