import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = (colors: any) =>
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
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      justifyContent: 'center',
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
    heading: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    listItem: {
      marginBottom: 5,
    },
    permissionContainer: {
      marginBottom: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    keysContainer: {
      flexWrap: 'wrap',
    },
    key: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 10,
      marginBottom: 10,
      fontSize: 16,
    },
    snapCell: {
      marginVertical: 16,
    },
    buttonSeparator: {
      width: 16,
    },
  });

export default createStyles;
