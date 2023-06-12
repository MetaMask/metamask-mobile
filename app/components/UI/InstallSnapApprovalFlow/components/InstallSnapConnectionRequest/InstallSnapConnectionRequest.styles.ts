import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';

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
    actionContainer: {
      flex: 0,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    snapCell: {
      marginVertical: 16,
    },
    description: {
      textAlign: 'center',
      paddingBottom: 16,
    },
  });

export default createStyles;
