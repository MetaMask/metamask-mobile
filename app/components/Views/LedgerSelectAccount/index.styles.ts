import { Colors } from '../../../util/theme/models';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
    },
    ledgerIcon: {
      width: 60,
      height: 60,
    },
    header: {
      marginTop: Device.isIphoneX() ? 50 : 20,
      flexDirection: 'row',
      width: '100%',
      paddingHorizontal: 32,
      alignItems: 'center',
    },
    navbarRightButton: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      height: 48,
      width: 48,
      flex: 1,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
    error: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.error,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

export default createStyles;
